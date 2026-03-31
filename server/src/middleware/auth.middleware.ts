import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
declare global{
  namespace Express{
    interface Request{
      userId?:string;
    }
  }
}

export function verifyUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "user isn't logged in" });
  }
  const JWT_SECRET = process.env.JWT_SECRET;
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
