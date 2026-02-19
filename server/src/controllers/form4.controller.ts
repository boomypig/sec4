import { Request, Response } from "express";
import * as sec from "../services/sec.service.js";
type TickerParams = { ticker: string };

export async function getCik(req: Request<TickerParams>, res: Response) {
  try {
    const data = await sec.getCikForTicker(req.params.ticker);
    res.json(data);
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";
    res.status(msg === "Ticker not found" ? 404 : 500).json({ error: msg });
  }
}

export async function getRecentByTicker(
  req: Request<TickerParams>,
  res: Response,
) {
  try {
    const data = await sec.getRecentForm4FilingsByTicker(req.params.ticker);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}

export async function locateXml(req: Request, res: Response) {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
      });
    }
    const out = await sec.findForm4XmlUrl(cik, accession);
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}

export async function getXml(req: Request, res: Response) {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
      });
    }

    const { xmlText, baseUrl, xmlFilename } = await sec.fetchForm4Xml(
      cik,
      accession,
    );

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-EDGAR-Base", baseUrl);
    res.setHeader("X-EDGAR-XML-File", xmlFilename ?? "unknown.xml");
    res.send(xmlText);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}

export async function getDetails(req: Request, res: Response) {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
      });
    }

    const data = await sec.getForm4Details(cik, accession);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
