import { pool } from "../index.js";

export async function listRecentTransactions(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT t.*,
            c.name AS category_name,
            c.icon AS category_icon,
            a.name AS account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN accounts a ON a.id = t.account_id
     WHERE t.user_id = $1
     ORDER BY t.occurred_on DESC, t.id DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// Inserting a transaction and adjusting the wallet balance must succeed or
// fail together, hence the explicit transaction block.
export async function createTransaction({
  userId,
  accountId,
  categoryId,
  kind,
  amount,
  note,
  occurredOn
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, accountId, categoryId, kind, amount, note, occurredOn]
    );

    if (accountId) {
      const delta = kind === "income" ? amount : -amount;
      await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3",
        [delta, accountId, userId]
      );
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTransaction(id, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING account_id, kind, amount`,
      [id, userId]
    );

    const removed = rows[0];

    if (removed && removed.account_id) {
      const amount = Number(removed.amount);
      const delta = removed.kind === "income" ? -amount : amount;
      await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        [delta, removed.account_id]
      );
    }

    await client.query("COMMIT");
    return Boolean(removed);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Slim rows for the Python analytics service: numbers as floats, dates as
// ISO strings, category names resolved.
export async function listTransactionsForAnalytics(userId, months = 6) {
  const { rows } = await pool.query(
    `SELECT t.kind,
            t.amount::float AS amount,
            to_char(t.occurred_on, 'YYYY-MM-DD') AS occurred_on,
            COALESCE(c.name, 'Uncategorized') AS category,
            COALESCE(c.icon, '🧾') AS icon
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
       AND t.occurred_on >= date_trunc('month', CURRENT_DATE) - make_interval(months => $2)
     ORDER BY t.occurred_on`,
    [userId, months - 1]
  );
  return rows;
}

export async function getMonthlySummary(userId, monthStart) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0) AS income,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0) AS expenses
     FROM transactions
     WHERE user_id = $1
       AND occurred_on >= $2
       AND occurred_on < $2::date + INTERVAL '1 month'`,
    [userId, monthStart]
  );
  return rows[0];
}
