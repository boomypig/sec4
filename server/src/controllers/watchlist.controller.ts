import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export async function getWatchlist(req: Request, res: Response) {
  // query DB
  3;
  return res.json([]);
}

export async function addToWatchlist(req:Request, res: Response){
  return res.json([])
}

export async function removeFromWatchlist(req:Request,res:Response){
  return res.json([])
}
