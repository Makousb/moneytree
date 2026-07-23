import { pool } from "./index.js";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    base_currency TEXT NOT NULL DEFAULT 'KES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- base_currency was added after launch: backfill existing users so their
  -- stored amounts stay pinned to whatever they were entered in.
  ALTER TABLE users ADD COLUMN IF NOT EXISTS base_currency TEXT;
  UPDATE users SET base_currency = currency WHERE base_currency IS NULL;

  -- Wallets: cash, bank, mobile money, credit card.
  CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- user_id IS NULL marks a built-in default category shared by everyone.
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    icon TEXT NOT NULL DEFAULT '💸'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    note TEXT,
    occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions (user_id, occurred_on DESC);

  -- month is always the first day of the month the budget applies to.
  CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    UNIQUE (user_id, category_id, month)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Uploaded receipt photos plus what the analytics service read off them.
  CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    merchant TEXT,
    total NUMERIC(12, 2),
    purchased_on DATE,
    items JSONB NOT NULL DEFAULT '[]',
    ocr_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const DEFAULT_CATEGORIES = [
  ["Food & Dining", "expense", "🍔"],
  ["Transport", "expense", "🚌"],
  ["Housing", "expense", "🏠"],
  ["Utilities", "expense", "💡"],
  ["Shopping", "expense", "🛍️"],
  ["Entertainment", "expense", "🎬"],
  ["Health", "expense", "⚕️"],
  ["Education", "expense", "📚"],
  ["Other", "expense", "🧾"],
  ["Salary", "income", "💼"],
  ["Business", "income", "🏪"],
  ["Gifts", "income", "🎁"],
  ["Other Income", "income", "💰"]
];

async function seedDefaultCategories() {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM categories WHERE user_id IS NULL"
  );

  if (rows[0].count > 0) {
    return;
  }

  for (const [name, kind, icon] of DEFAULT_CATEGORIES) {
    await pool.query(
      "INSERT INTO categories (user_id, name, kind, icon) VALUES (NULL, $1, $2, $3)",
      [name, kind, icon]
    );
  }

  console.info("Seeded default categories");
}

// Best-effort: returns false instead of throwing so the app can still boot
// (public pages, in-memory sessions) before PostgreSQL is configured.
export async function ensureSchema() {
  try {
    await pool.query(SCHEMA_SQL);
    await seedDefaultCategories();
    console.info("Database schema is ready");
    return true;
  } catch (error) {
    console.warn("Database unavailable — starting without persistence.");
    console.warn(`  (${error.message})`);
    console.warn("  Copy .env.example to .env, point it at PostgreSQL, and restart.");
    return false;
  }
}
