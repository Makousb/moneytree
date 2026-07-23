import { listBudgetsWithSpend } from "../db/queries/budgets.js";
import { listGoals } from "../db/queries/goals.js";
import { listReceiptsForAnalytics } from "../db/queries/receipts.js";
import { listTransactionsForAnalytics } from "../db/queries/transactions.js";
import {
  getInsights,
  toBudgetPayload,
  toGoalPayload
} from "../services/analytics.js";
import { monthLabel, monthStart, today } from "../utils/dates.js";

export async function showReports(req, res, next) {
  try {
    const user = req.session.user;

    const [transactions, budgets, goals, receipts] = await Promise.all([
      listTransactionsForAnalytics(user.id, 6),
      listBudgetsWithSpend(user.id, monthStart()),
      listGoals(user.id),
      listReceiptsForAnalytics(user.id, 6)
    ]);

    // report is null when the Python service is down; the view degrades.
    const report = await getInsights({
      today: today(),
      currency: user.currency,
      rate: res.locals.fxRate,
      transactions,
      budgets: toBudgetPayload(budgets),
      goals: toGoalPayload(goals),
      receipts
    });

    res.render("reports", {
      title: "Reports",
      monthLabel: monthLabel(),
      report,
      alerts: report ? report.alerts : [],
      goalImpact: report ? report.goal_impact : null,
      // Escape "<" so user-supplied strings can never close the script tag.
      reportJson: report
        ? JSON.stringify({ ...report, currency: user.currency }).replace(
            /</g,
            "\\u003c"
          )
        : null
    });
  } catch (error) {
    next(error);
  }
}
