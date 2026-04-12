import { Router } from "express";
import {
  getWatchlist,
  addToWatchlist,
  addByTicker,
  removeFromWatchlist,
} from "../controllers/watchlist.controller.js";

const router = Router();

router.get("/", getWatchlist);
router.post("/", addToWatchlist);
router.post("/ticker", addByTicker);
router.delete("/", removeFromWatchlist);

export default router;
