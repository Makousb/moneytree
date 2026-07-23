import { config } from "../config/env.js";
import { toISODate } from "../utils/dates.js";

// Returns null when the analytics service is unreachable so callers can
// degrade gracefully instead of failing the whole page.
async function postJson(path, payload, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.analyticsUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Analytics service responded ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Analytics service unavailable: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Full report for the Reports page (trend, breakdown, forecast, alerts).
export function getInsights(payload) {
  return postJson("/insights", payload);
}

// Lightweight burn-rate alerts + goal impact, cheap enough for every
// dashboard/budgets page load.
export function getAlerts(payload) {
  return postJson("/alerts", payload);
}

// OCR + field extraction for an uploaded receipt photo. Tesseract can take
// a while on large photos, hence the generous timeout.
export function parseReceipt(payload) {
  return postJson("/receipts/parse", payload, 30000);
}

export function toBudgetPayload(budgets) {
  return budgets.map((b) => ({
    category: b.category_name,
    icon: b.category_icon,
    amount: Number(b.amount),
    spent: Number(b.spent)
  }));
}

export function toGoalPayload(goals) {
  return goals.map((g) => ({
    name: g.name,
    target_amount: Number(g.target_amount),
    saved_amount: Number(g.saved_amount),
    target_date: toISODate(g.target_date)
  }));
}
