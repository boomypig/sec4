import { Router } from "express";
import * as c from "../controllers/form4.controller.js";

const router = Router();

// IMPORTANT: put fixed paths BEFORE "/:ticker" to avoid route conflicts
router.get("/details", c.getDetails);
router.get("/xml", c.getXml);
router.get("/xml-locate", c.locateXml);

// ticker → cik
router.get("/cik/:ticker", c.getCik);

// recent filings by ticker
router.get("/:ticker", c.getRecentByTicker);

export default router;
