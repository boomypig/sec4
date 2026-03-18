import { Router } from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlist.controller.js";

const router = Router();

router.get("/getwatchlist", getWatchlist);
router.post("/addwatchlist", addToWatchlist);
router.delete("/:ticker",removeFromWatchlist);

export default router;
