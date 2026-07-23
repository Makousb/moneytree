import { updateUserCurrency } from "../db/queries/users.js";
import { CURRENCIES, isSupportedCurrency } from "../utils/currencies.js";
import { getRate, getRatesInfo, refreshRates } from "../services/fx.js";

export function showSettings(req, res) {
  const base = req.session.user.base_currency || req.session.user.currency;
  const display = req.session.user.currency;

  res.render("settings", {
    title: "Settings",
    currencies: CURRENCIES,
    baseCurrency: base,
    // Live rate in both directions for the info panel.
    rateBaseToDisplay: getRate(base, display),
    rateDisplayToBase: getRate(display, base),
    ratesInfo: getRatesInfo(),
    // Live preview of the same amount in each currency for the picker.
    sampleAmount: 1234.5
  });
}

export async function updateCurrency(req, res, next) {
  const currency = (req.body.currency || "").trim().toUpperCase();

  if (!isSupportedCurrency(currency)) {
    req.flash("error", "Choose a currency from the list.");
    return res.redirect("/settings");
  }

  try {
    const updated = await updateUserCurrency(req.session.user.id, currency);

    if (!updated) {
      req.flash("error", "Could not update your currency.");
      return res.redirect("/settings");
    }

    // Reflect the change immediately across every page this session.
    req.session.user.currency = updated.currency;

    req.flash(
      "success",
      `Now showing amounts in ${currency}, converted live from ${
        updated.base_currency
      }.`
    );
    return res.redirect("/settings");
  } catch (error) {
    return next(error);
  }
}

export async function refreshFxRates(req, res, next) {
  try {
    await refreshRates(true);
    const info = getRatesInfo();
    req.flash(
      "success",
      info.stale
        ? "Couldn't reach the rate provider — showing the last known rates."
        : "Exchange rates refreshed."
    );
    return res.redirect("/settings");
  } catch (error) {
    return next(error);
  }
}
