import { pool } from "../index.js";

export async function createReceipt({
  userId,
  filename,
  merchant,
  total,
  purchasedOn,
  items,
  ocrText,
  categoryId
}) {
  const { rows } = await pool.query(
    `INSERT INTO receipts
       (user_id, filename, merchant, total, purchased_on, items, ocr_text, category_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      filename,
      merchant,
      total,
      purchasedOn,
      JSON.stringify(items || []),
      ocrText,
      categoryId
    ]
  );
  return rows[0];
}

export async function listReceipts(userId) {
  const { rows } = await pool.query(
    `SELECT r.*,
            c.name AS category_name,
            c.icon AS category_icon
     FROM receipts r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getReceipt(id, userId) {
  const { rows } = await pool.query(
    "SELECT * FROM receipts WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rows[0] || null;
}

export async function linkReceiptTransaction(id, userId, transactionId) {
  await pool.query(
    "UPDATE receipts SET transaction_id = $1 WHERE id = $2 AND user_id = $3",
    [transactionId, id, userId]
  );
}

// Slim rows for the Python analytics service's shopping-pattern analysis.
export async function listReceiptsForAnalytics(userId, months = 6) {
  const { rows } = await pool.query(
    `SELECT COALESCE(merchant, '') AS merchant,
            total::float AS total,
            to_char(purchased_on, 'YYYY-MM-DD') AS purchased_on,
            items
     FROM receipts
     WHERE user_id = $1
       AND purchased_on IS NOT NULL
       AND purchased_on >= date_trunc('month', CURRENT_DATE) - make_interval(months => $2)`,
    [userId, months - 1]
  );
  return rows;
}
