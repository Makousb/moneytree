import { createAccount, listAccounts } from "../db/queries/accounts.js";

const ACCOUNT_TYPES = ["cash", "bank", "mobile_money", "credit_card"];

export async function listAccountsPage(req, res, next) {
  try {
    const accounts = await listAccounts(req.session.user.id);
    res.render("accounts", {
      title: "Accounts",
      accounts,
      accountTypes: ACCOUNT_TYPES
    });
  } catch (error) {
    next(error);
  }
}

export async function addAccount(req, res, next) {
  const name = (req.body.name || "").trim();
  const type = ACCOUNT_TYPES.includes(req.body.type) ? req.body.type : "cash";

  if (!name) {
    req.flash("error", "Give the account a name.");
    return res.redirect("/accounts");
  }

  try {
    await createAccount({ userId: req.session.user.id, name, type });
    req.flash("success", "Account added.");
    return res.redirect("/accounts");
  } catch (error) {
    return next(error);
  }
}
