import { CURRENCY_BY_CODE, DEFAULT_CURRENCY } from "./currencies.js";

const numberFormatters = new Map();

function numberFormatter(decimals) {
  if (!numberFormatters.has(decimals)) {
    numberFormatters.set(
      decimals,
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    );
  }
  return numberFormatters.get(decimals);
}

export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  const info = CURRENCY_BY_CODE.get(currency) || { symbol: currency, decimals: 2 };
  const number = numberFormatter(info.decimals).format(Number(amount) || 0);
  // Letter symbols ("KSh", "R") get a space; glyphs ("$", "€") hug the number.
  const separator = /[A-Za-z]$/.test(info.symbol) ? " " : "";
  return `${info.symbol}${separator}${number}`;
}
