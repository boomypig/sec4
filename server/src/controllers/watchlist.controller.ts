import { Request, Response } from "express";
import { pool } from "../db/pool";

export async function getWatchlist(req: Request, res: Response) {
  // query DB
  return res.json([]);
}
