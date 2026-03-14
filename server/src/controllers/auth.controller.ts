import { Request, response, Response } from "express";
import { pool } from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { resourceLimits } from "node:worker_threads";
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
export async function register(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || password) {
    return response
      .status(400)
      .json({ error: "Email and Password are required" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (existing.rows.length > 0) {
    return response.status(409).json({ error: "Email already registered" });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    "INSERT INTO users (email,password) VALUES ($1,$2) RETURNING id",
    [email, password_hash],
  );

  return res.status(200).json({
    message: "Account fully registered successfullym, Please log in.",
    userId: result.rows[0].id,
  });
}

export async function login(req: Request, res: Response) {}
