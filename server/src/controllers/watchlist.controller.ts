import { Request, Response } from "express";
import { pool } from "../db/pool.js";

export  function getWatchlist(req: Request, res: Response) {
  // query DB
  const {user} = req.body


  return res.json({message:"HELLOW"});
}

export async function addToWatchlist(req:Request, res: Response){

  const client = await pool.connect()
  const userId = req.userId
  const companyId = req.body
  try{
  }catch{

  }
  return res.json([])
}

export  function removeFromWatchlist(req:Request,res:Response){
  return res.json([])
}
