import { listAccounts } from "../db/queries/accounts.js";
import { listCategories } from "../db/queries/categories.js";
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  setRecurringActive
} from "../db/queries/recurring.js";
import { toBase } from "../services/fx.js";
import { materializeDueRecurring } from "../services/recurring.js";
import { today } from "../utils/dates.js";

const FREQUENCIES = ["weekly", "monthly", "yearly"];

export async function showRecurringPage(req, res, next) {
  try {
    const userId = req.session.user.id;

    // Catch up any due rules first so the list and balances are current.
    await materializeDueRecurring(userId);

    const [recurring, accounts, categories] = await Promise.all([
      listRecurring(userId),
      listAccounts(userId),
      listCategories(userId)
    ]);

    res.render("recurring", {
      title: "Recurring",
      recurring,
      accounts,
      categories,
      frequencies: FREQUENCIES,
      today: today()
    });
  } catch (error) {
    next(error);
  }
}

export async function addRecurring(req, res, next) {
  const amount = Number.parseFloat(req.body.amount);
  const kind = req.body.kind === "income" ? "income" : "expense";
  const frequency = FREQUENCIES.includes(req.body.frequency)
    ? req.body.frequency
    : "monthly";
  const nextRun = req.body.nextRun || today();

  if (!Number.isFinite(amount) || amount <= 0) {
    req.flash("error", "Enter an amount greater than zero.");
    return res.redirect("/recurring");
  }

  try {
    await createRecurring({
      userId: req.session.user.id,
      accountId: req.body.accountId || null,
      categoryId: req.body.categoryId || null,
      kind,
      // Entered in the display currency; store in the base currency.
      amount: toBase(req.session.user, amount),
      note: (req.body.note || "").trim() || null,
      frequency,
      nextRun
    });

    // Materialize immediately in case the first run is today or earlier.
    await materializeDueRecurring(req.session.user.id);

    req.flash("success", "Recurring transaction scheduled.");
    return res.redirect("/recurring");
  } catch (error) {
    return next(error);
  }
}

export async function toggleRecurring(req, res, next) {
  try {
    const active = req.body.active === "true";
    await setRecurringActive(
      Number(req.params.id),
      req.session.user.id,
      active
    );

    // Resuming may leave past occurrences due — catch them up now.
    if (active) {
      await materializeDueRecurring(req.session.user.id);
    }

    req.flash("success", active ? "Recurring resumed." : "Recurring paused.");
    return res.redirect("/recurring");
  } catch (error) {
    return next(error);
  }
}

export async function removeRecurring(req, res, next) {
  try {
    const removed = await deleteRecurring(
      Number(req.params.id),
      req.session.user.id
    );

    req.flash(
      removed ? "success" : "error",
      removed ? "Recurring transaction deleted." : "Not found."
    );
    return res.redirect("/recurring");
  } catch (error) {
    return next(error);
  }
}
