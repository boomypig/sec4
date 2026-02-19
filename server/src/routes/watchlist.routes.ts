import { Router } from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlist.controller.js";

const router = Router();

router.get("/", getWatchlist);
router.post("/", addToWatchlist);
router.delete("/:ticker", removeFromWatchlist);

export default router;
