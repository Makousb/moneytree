import {
  addLoanPayment,
  createLoan,
  deleteLoan,
  getLoan,
  listLoanPayments,
  listLoans,
  monthlySpendByCategory
} from "../db/queries/loans.js";
import { getLoanPlan } from "../services/analytics.js";
import { toBase } from "../services/fx.js";
import { today } from "../utils/dates.js";
import { loanMetrics } from "../utils/loans.js";

function groupPayments(payments) {
  const byLoan = new Map();
  for (const payment of payments) {
    if (!byLoan.has(payment.loan_id)) {
      byLoan.set(payment.loan_id, []);
    }
    byLoan.get(payment.loan_id).push(payment);
  }
  return byLoan;
}

async function loansWithMetrics(userId) {
  const [loans, payments] = await Promise.all([
    listLoans(userId),
    listLoanPayments(userId)
  ]);
  const byLoan = groupPayments(payments);
  const todayIso = today();

  return loans.map((loan) => ({
    ...loan,
    metrics: loanMetrics(loan, byLoan.get(loan.id) || [], todayIso),
    paymentCount: (byLoan.get(loan.id) || []).length
  }));
}

export async function showLoansPage(req, res, next) {
  try {
    const loans = await loansWithMetrics(req.session.user.id);

    const totals = loans.reduce(
      (acc, l) => {
        acc.owed += l.metrics.balance;
        acc.paid += l.metrics.totalPaid;
        acc.monthlyInterest += l.metrics.monthlyInterest;
        return acc;
      },
      { owed: 0, paid: 0, monthlyInterest: 0 }
    );

    res.render("loans", {
      title: "Loans",
      loans,
      totals,
      today: today()
    });
  } catch (error) {
    next(error);
  }
}

export async function addLoan(req, res, next) {
  const name = (req.body.name || "").trim();
  const principal = Number.parseFloat(req.body.principal);
  const apr = Number.parseFloat(req.body.apr);
  const minimumPayment = Number.parseFloat(req.body.minimumPayment) || 0;

  if (!name || !Number.isFinite(principal) || principal <= 0) {
    req.flash("error", "Give the loan a name and a balance greater than zero.");
    return res.redirect("/loans");
  }

  try {
    await createLoan({
      userId: req.session.user.id,
      name,
      lender: (req.body.lender || "").trim() || null,
      // Money fields entered in display currency; store in base. APR is a
      // rate, not money, so it's kept as-is.
      principal: toBase(req.session.user, principal),
      apr: Number.isFinite(apr) && apr >= 0 ? apr : 0,
      minimumPayment: toBase(req.session.user, minimumPayment),
      startDate: req.body.startDate || today()
    });

    req.flash("success", "Loan added.");
    return res.redirect("/loans");
  } catch (error) {
    return next(error);
  }
}

export async function addPayment(req, res, next) {
  const amount = Number.parseFloat(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    req.flash("error", "Enter a payment greater than zero.");
    return res.redirect("/loans");
  }

  try {
    const loan = await getLoan(Number(req.params.id), req.session.user.id);
    if (!loan) {
      req.flash("error", "Loan not found.");
      return res.redirect("/loans");
    }

    await addLoanPayment({
      loanId: loan.id,
      userId: req.session.user.id,
      amount: toBase(req.session.user, amount),
      paidOn: req.body.paidOn || today(),
      note: (req.body.note || "").trim() || null
    });

    req.flash("success", "Payment recorded.");
    return res.redirect("/loans");
  } catch (error) {
    return next(error);
  }
}

export async function removeLoan(req, res, next) {
  try {
    const removed = await deleteLoan(Number(req.params.id), req.session.user.id);
    req.flash(
      removed ? "success" : "error",
      removed ? "Loan deleted." : "Loan not found."
    );
    return res.redirect("/loans");
  } catch (error) {
    return next(error);
  }
}

export async function showPlanPage(req, res, next) {
  try {
    const user = req.session.user;
    const [loans, categories] = await Promise.all([
      loansWithMetrics(user.id),
      monthlySpendByCategory(user.id, 3)
    ]);

    const extra = Number.parseFloat(req.query.extra);
    const extraMonthly = Number.isFinite(extra) && extra > 0 ? extra : 0;

    // plan is null when the analytics service is down; the view degrades.
    const plan = await getLoanPlan({
      today: today(),
      currency: user.currency,
      rate: res.locals.fxRate,
      loans: loans.map((l) => ({
        name: l.name,
        balance: l.metrics.balance,
        apr: Number(l.apr),
        min_payment: Number(l.minimum_payment)
      })),
      categories: categories.map((c) => ({
        name: c.name,
        icon: c.icon,
        monthly_avg: Number(c.monthly_avg),
        budget: c.budget == null ? null : Number(c.budget)
      })),
      // extra is typed in display currency; convert back to base for the service.
      extra_monthly: extraMonthly ? toBase(user, extraMonthly) : 0
    });

    res.render("loan-plan", {
      title: "Payoff plan",
      plan,
      hasLoans: loans.length > 0,
      extraInput: extraMonthly || ""
    });
  } catch (error) {
    next(error);
  }
}
