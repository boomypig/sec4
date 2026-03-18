import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export  function getWatchlist(req: Request, res: Response) {
  // query DB
  
  return res.json({message:"HELLOW"});
}

export  function addToWatchlist(req:Request, res: Response){
  return res.json([])
}

export  function removeFromWatchlist(req:Request,res:Response){
  return res.json([])
}
