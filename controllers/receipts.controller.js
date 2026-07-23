import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { listAccounts } from "../db/queries/accounts.js";
import { listCategories } from "../db/queries/categories.js";
import {
  createReceipt,
  getReceipt,
  linkReceiptTransaction,
  listReceipts
} from "../db/queries/receipts.js";
import { createTransaction } from "../db/queries/transactions.js";
import { parseReceipt } from "../services/analytics.js";
import { toBase } from "../services/fx.js";
import { today } from "../utils/dates.js";

const __filename = fileURLToPath(import.meta.url);
export const UPLOADS_DIR = path.join(
  path.dirname(__filename),
  "..",
  "uploads",
  "receipts"
);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export async function showReceiptsPage(req, res, next) {
  try {
    const receipts = await listReceipts(req.session.user.id);
    res.render("receipts", { title: "Receipts", receipts });
  } catch (error) {
    next(error);
  }
}

export async function uploadReceipt(req, res, next) {
  if (!req.file) {
    req.flash("error", "Choose or take a photo of a receipt first.");
    return res.redirect("/receipts");
  }

  try {
    const userId = req.session.user.id;

    // Ship the photo to the Python service for OCR + field extraction.
    // null means the service is down; empty parse still lets the user
    // fill the review form by hand.
    const imageBase64 = fs.readFileSync(
      path.join(UPLOADS_DIR, req.file.filename)
    ).toString("base64");
    const parsed = await parseReceipt({
      image_base64: imageBase64,
      today: today()
    });

    if (!parsed || parsed.error) {
      req.flash(
        "error",
        parsed?.error ||
          "The analytics service is offline — fill in the details manually."
      );
    }

    // Map the guessed category name onto one the user can actually see.
    let categoryId = null;
    if (parsed?.category) {
      const categories = await listCategories(userId);
      const match = categories.find(
        (c) => c.kind === "expense" && c.name === parsed.category
      );
      categoryId = match ? match.id : null;
    }

    const receipt = await createReceipt({
      userId,
      filename: req.file.filename,
      merchant: parsed?.merchant || null,
      total: parsed?.total ?? null,
      purchasedOn: parsed?.purchased_on || today(),
      items: parsed?.items || [],
      ocrText: parsed?.ocr_text || null,
      categoryId
    });

    return res.redirect(`/receipts/${receipt.id}/review`);
  } catch (error) {
    return next(error);
  }
}

export async function showReviewPage(req, res, next) {
  try {
    const userId = req.session.user.id;
    const receipt = await getReceipt(Number(req.params.id), userId);

    if (!receipt) {
      req.flash("error", "Receipt not found.");
      return res.redirect("/receipts");
    }

    const [accounts, categories] = await Promise.all([
      listAccounts(userId),
      listCategories(userId)
    ]);

    return res.render("receipt-review", {
      title: "Review Receipt",
      receipt,
      accounts,
      expenseCategories: categories.filter((c) => c.kind === "expense")
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmReceipt(req, res, next) {
  const amount = Number.parseFloat(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    req.flash("error", "Enter an amount greater than zero.");
    return res.redirect(`/receipts/${req.params.id}/review`);
  }

  try {
    const userId = req.session.user.id;
    const receipt = await getReceipt(Number(req.params.id), userId);

    if (!receipt) {
      req.flash("error", "Receipt not found.");
      return res.redirect("/receipts");
    }

    const note =
      (req.body.note || "").trim() ||
      (receipt.merchant ? `Receipt: ${receipt.merchant}` : "Receipt");

    const transaction = await createTransaction({
      userId,
      accountId: req.body.accountId || null,
      categoryId: req.body.categoryId || null,
      kind: "expense",
      // Confirmed in the display currency; store in the base currency.
      amount: toBase(req.session.user, amount),
      note,
      occurredOn: req.body.occurredOn || today()
    });

    await linkReceiptTransaction(receipt.id, userId, transaction.id);

    req.flash("success", "Receipt saved as an expense.");
    return res.redirect("/receipts");
  } catch (error) {
    return next(error);
  }
}

export async function serveReceiptImage(req, res, next) {
  try {
    const receipt = await getReceipt(
      Number(req.params.id),
      req.session.user.id
    );

    if (!receipt) {
      return res.status(404).render("404", { title: "Page Not Found" });
    }

    return res.sendFile(path.join(UPLOADS_DIR, receipt.filename));
  } catch (error) {
    return next(error);
  }
}
