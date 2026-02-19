import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export async function getWatchlist(req: Request, res: Response) {
  // query DB
  return res.json([]);
}
