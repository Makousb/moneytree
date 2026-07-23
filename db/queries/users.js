import { pool } from "../index.js";
import { DEFAULT_CURRENCY } from "../../utils/currencies.js";

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email
  ]);
  return rows[0] || null;
}

export async function createUser({
  name,
  email,
  passwordHash,
  currency = DEFAULT_CURRENCY
}) {
  // A new account's stored amounts live in the currency chosen at signup, so
  // base and display start the same.
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, currency, base_currency)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING id, name, email, currency, base_currency`,
    [name, email, passwordHash, currency]
  );
  return rows[0];
}

export async function updateUserCurrency(userId, currency) {
  const { rows } = await pool.query(
    `UPDATE users SET currency = $1 WHERE id = $2
     RETURNING id, name, email, currency, base_currency`,
    [currency, userId]
  );
  return rows[0] || null;
}
