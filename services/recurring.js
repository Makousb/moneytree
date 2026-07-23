import {
  getDueRecurring,
  setRecurringNextRun
} from "../db/queries/recurring.js";
import { createTransaction } from "../db/queries/transactions.js";
import { nextOccurrence, today } from "../utils/dates.js";

// Safety cap so a rule with a far-past start date can't create thousands of
// transactions in one pass.
const MAX_CATCHUP = 60;

// Create any transactions that recurring rules are due for, up to today, and
// advance each rule to its next occurrence. Idempotent and safe to call from
// multiple entry points (dashboard, transactions, recurring pages).
export async function materializeDueRecurring(userId) {
  const due = await getDueRecurring(userId, today());
  const todayIso = today();
  let created = 0;

  for (const rule of due) {
    let run = rule.next_run_iso;
    let guard = 0;

    while (run <= todayIso && guard < MAX_CATCHUP) {
      await createTransaction({
        userId,
        accountId: rule.account_id,
        categoryId: rule.category_id,
        kind: rule.kind,
        amount: Number(rule.amount),
        note: rule.note || "Recurring",
        occurredOn: run
      });
      created += 1;
      run = nextOccurrence(run, rule.frequency);
      guard += 1;
    }

    await setRecurringNextRun(rule.id, userId, run);
  }

  return created;
}
