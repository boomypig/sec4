import { Router } from "express";
import { getRecentFeed, getWatchlistFeed } from "../controllers/feed.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/recent", getRecentFeed);
router.get("/watchlist", verifyUser, getWatchlistFeed);

export default router;
