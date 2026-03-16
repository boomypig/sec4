import jwt from "jsonwebtoken";
import { Request, response, Response, NextFunction } from "express";
import { error } from "node:console";
import { json } from "node:stream/consumers";

declare global{
  namespace Express{
    interface Request{
      userId?:string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function verifyUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies.token;
  if (!token) {
    return response.status(401).json({ error: "user isn't logged in" });
  }
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    req.userId = decoded.userId;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
