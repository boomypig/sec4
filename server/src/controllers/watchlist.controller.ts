import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export async function getWatchlist(req: Request, res: Response) {
  // query DB
  const user = req.userId;
  const client = await pool.connect();
  try {
    const queryResult = await client.query(
      "SELECT company_id FROM watchlists WHERE user_id = $1",
      [user],
    );
    console.log(queryResult);
    return res
      .status(200)
      .json({ user: user, userCompanies: queryResult.rows });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get watchlist" });
  } finally {
    client.release();
  }
}

export async function addToWatchlist(req: Request, res: Response) {
  const { companyId } = req.body;
  const user = req.userId;
  console.log(companyId);
  if (!companyId || !user) {
    return res
      .status(401)
      .json({ error: "NO company or there is no ID and they need to log in" });
  }

  const client = await pool.connect();
  try {
    const checkCompanyQuery = await pool.query(
      "SELECT id FROM companies WHERE id = $1",
      [companyId],
    );
    if (checkCompanyQuery.rowCount === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
    await client.query("BEGIN");

    const insertToWatchlist = await client.query(
      "INSERT INTO watchlists (user_id,company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [user, companyId],
    );

    console.log(insertToWatchlist);
    await client.query("COMMIT");
    return res.status(201).json({
      message: "Successfully added company to your watchlist",
    });
  } catch (e) {
    await client.query("ROLLBACK");
    return res
      .status(500)
      .json({ error: "Failed to add company to watchlist" });
  } finally {
    client.release();
  }
}

export async function removeFromWatchlist(req: Request, res: Response) {
  const user = req.userId;
  const { companyId } = req.body;

  if (!user || !companyId) {
    return res.status(401).json({ error: "No company or Id exist" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM watchlists WHERE user_id = $1 AND company_id = $2",
      [user, companyId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found in watchlist" });
    }
    return res
      .status(200)
      .json({ message: "Successfully deleted from watchlist" });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Failed to dekete company to watchlist" });
  }
}
