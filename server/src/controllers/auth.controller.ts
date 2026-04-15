import { Request, Response } from "express";
import { pool } from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export async function register(req: Request, res: Response) {
  const JWT_SECRET = process.env.JWT_SECRET;
  const SALT_ROUNDS = 12;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and Password are required" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    "INSERT INTO users (email,password_hash) VALUES ($1,$2) RETURNING id",
    [email, password_hash],
  );

  return res.status(201).json({
    message: "Account fully registered successfully, Please log in.",
    userId: result.rows[0].id,
  });
}

export async function login(req: Request, res: Response) {
  const JWT_SECRET = process.env.JWT_SECRET;
  const SALT_ROUNDS = 12;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and Password required" });
  }

  const result = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Email or password invalid" });
  }
  console.log(result);
  const user = result.rows[0];
  console.log(user);
  const isvalid = await bcrypt.compare(password, user.password_hash);

  if (!isvalid) {
    return res.status(401).json({
      error: "Email or password invalid",
    });
  }

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ message: "Logged in successfully" });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.status(200).json({ message: "Logged out" });
}

export async function getMe(req: Request, res: Response) {
  try {
    const result = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      userId: result.rows[0].id,
      email: result.rows[0].email,
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get user" });
  }
}
