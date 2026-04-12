import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export async function getRecentFeed(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const { rows } = await pool.query(
      `SELECT
         f.filing_id, f.accession_no, f.form_type, f.filing_date, f.period_of_report,
         c.id AS company_id, c.ticker, c.name AS company_name,
         (
           SELECT json_agg(json_build_object(
             'ownerName',       t.owner_name,
             'ownerTitle',      t.owner_title,
             'transactionCode', t.transaction_code,
             'shares',          t.shares,
             'pricePerShare',   t.price_per_share,
             'totalValue',      t.value_total,
             'transactionDate', t.transaction_date,
             'acquiredDisposed',t.acquired_disposed,
             'securityTitle',   t.security_title
           ))
           FROM form4_transactions t
           WHERE t.filing_id = f.filing_id
         ) AS transactions
       FROM form4_filings f
       JOIN companies c ON f.company_id = c.id
       ORDER BY f.filing_date DESC, f.filing_id DESC
       LIMIT $1`,
      [limit],
    );

    return res.json({ filings: rows });
  } catch (e) {
    console.error("getRecentFeed error:", e);
    return res.status(500).json({ error: "Failed to fetch recent filings" });
  }
}

export async function getWatchlistFeed(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const { rows } = await pool.query(
      `SELECT
         f.filing_id, f.accession_no, f.form_type, f.filing_date, f.period_of_report,
         c.id AS company_id, c.ticker, c.name AS company_name,
         (
           SELECT json_agg(json_build_object(
             'ownerName',       t.owner_name,
             'ownerTitle',      t.owner_title,
             'transactionCode', t.transaction_code,
             'shares',          t.shares,
             'pricePerShare',   t.price_per_share,
             'totalValue',      t.value_total,
             'transactionDate', t.transaction_date,
             'acquiredDisposed',t.acquired_disposed,
             'securityTitle',   t.security_title
           ))
           FROM form4_transactions t
           WHERE t.filing_id = f.filing_id
         ) AS transactions
       FROM form4_filings f
       JOIN companies c ON f.company_id = c.id
       JOIN watchlists w ON w.company_id = c.id AND w.user_id = $1
       ORDER BY f.filing_date DESC, f.filing_id DESC
       LIMIT $2`,
      [userId, limit],
    );

    return res.json({ filings: rows });
  } catch (e) {
    console.error("getWatchlistFeed error:", e);
    return res.status(500).json({ error: "Failed to fetch watchlist feed" });
  }
}
