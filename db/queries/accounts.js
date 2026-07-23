import { pool } from "../index.js";

export async function listAccounts(userId) {
  const { rows } = await pool.query(
    "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at",
    [userId]
  );
  return rows;
}

export async function createAccount({ userId, name, type }) {
  const { rows } = await pool.query(
    `INSERT INTO accounts (user_id, name, type)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, name, type]
  );
  return rows[0];
}
