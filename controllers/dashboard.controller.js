import { listBudgetsWithSpend } from "../db/queries/budgets.js";
import { listGoals } from "../db/queries/goals.js";
import {
  getMonthlySummary,
  listRecentTransactions
} from "../db/queries/transactions.js";
import {
  getAlerts,
  toBudgetPayload,
  toGoalPayload
} from "../services/analytics.js";
import { materializeDueRecurring } from "../services/recurring.js";
import { monthLabel, monthStart, today } from "../utils/dates.js";

export async function showDashboard(req, res, next) {
  try {
    const user = req.session.user;
    const month = monthStart();

    // Record any recurring transactions that have come due since last visit.
    await materializeDueRecurring(user.id);

    const [summary, recent, budgets, goals] = await Promise.all([
      getMonthlySummary(user.id, month),
      listRecentTransactions(user.id, 5),
      listBudgetsWithSpend(user.id, month),
      listGoals(user.id)
    ]);

    // Burn-rate alerts from the analytics service; null when it's offline.
    const alertsData = await getAlerts({
      today: today(),
      currency: user.currency,
      rate: res.locals.fxRate,
      budgets: toBudgetPayload(budgets),
      goals: toGoalPayload(goals)
    });

    res.render("dashboard", {
      title: "Dashboard",
      monthLabel: monthLabel(),
      income: Number(summary.income),
      expenses: Number(summary.expenses),
      recent,
      budgets,
      goals,
      alerts: alertsData ? alertsData.alerts : [],
      goalImpact: alertsData ? alertsData.goal_impact : null
    });
  } catch (error) {
    next(error);
  }
}
