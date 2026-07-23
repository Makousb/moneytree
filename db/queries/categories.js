import { pool } from "../index.js";

// Built-in defaults (user_id IS NULL) plus the user's own categories.
export async function listCategories(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM categories
     WHERE user_id IS NULL OR user_id = $1
     ORDER BY kind, name`,
    [userId]
  );
  return rows;
}
