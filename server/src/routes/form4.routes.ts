import { Router } from "express";
import * as c from "../controllers/form4.controller.js";

const router = Router();
// IMPORTANT: put fixed paths BEFORE "/:ticker" to avoid route conflicts
router.get("/form4/details", c.getDetails);
router.get("/form4/xml", c.getXml);
router.get("/form4/xml-locate", c.locateXml);

// ticker → cik
router.get("/cik/:ticker", c.getCik);

// recent filings by ticker
router.get("/form4/:ticker", c.getRecentByTicker);

export default router;
