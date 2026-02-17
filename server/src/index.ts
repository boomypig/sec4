import express from "express";
import { pool } from "./db/pool.js";
import { XMLParser } from "fast-xml-parser";
import "dotenv/config";

const app = express();
const PORT = Number(process.env.PORT);

// IMPORTANT: SEC endpoints require a descriptive User-Agent with contact info.
const SEC_HEADERS = {
  "User-Agent": process.env.USER_AGENT!,
  "Accept-Encoding": "gzip, deflate",
};

// --- helpers ---
function cik10ToIntString(cik10: string) {
  // EDGAR archive paths use non-zero-padded CIK
  return String(Number(cik10));
}

function accessionNoDashes(accession: string) {
  return accession.replace(/-/g, "");
}

function filingBaseUrl(cik10: string, accession: string) {
  const cikInt = cik10ToIntString(cik10);
  const acc = accessionNoDashes(accession);
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${acc}`;
}

async function secFetchJson(url: string) {
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `SEC request failed ${res.status} for ${url}\n${text.slice(0, 300)}`,
    );
  }
  return res.json();
}

async function secFetchText(url: string) {
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `SEC request failed ${res.status} for ${url}\n${text.slice(0, 300)}`,
    );
  }
  return res.text();
}

function padCik(cik: number | string) {
  return String(cik).padStart(10, "0");
}

// Very small in-memory cache so you don't repeatedly hit SEC endpoints.
let tickerMapCache: any[] | null = null;
let tickerMapFetchedAt = 0;

async function getTickerMap() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (tickerMapCache && Date.now() - tickerMapFetchedAt < ONE_DAY)
    return tickerMapCache;

  // Official files are referenced by SEC pages (company_tickers*.json)
  const url = "https://www.sec.gov/files/company_tickers.json";
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ticker map: ${res.status}`);
  const data = await res.json();

  // data is an object keyed by row-number in many versions; normalize to array:
  const arr = Array.isArray(data) ? data : Object.values(data);

  tickerMapCache = arr;
  tickerMapFetchedAt = Date.now();
  return arr;
}
app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 1) Ticker -> CIK
app.get("/api/cik/:ticker", async (req, res) => {
  try {
    const ticker = String(req.params.ticker).toUpperCase();
    const map = await getTickerMap();
    const row = map.find((x: any) => String(x.ticker).toUpperCase() === ticker);
    if (!row) return res.status(404).json({ error: "Ticker not found" });

    res.json({ ticker, cik: padCik(row.cik_str ?? row.cik) });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Unknown error" });
  }
});

// 2) Fetch recent Form 4 filings from submissions JSON

/**
 * Given a CIK10 + accession, fetch index.json and pick the best XML file.
 * Returns: { baseUrl, indexUrl, xmlUrl, xmlFilename }
 */
async function findForm4XmlUrl(cik10: string, accession: string) {
  const baseUrl = filingBaseUrl(cik10, accession);
  const indexUrl = `${baseUrl}/index.json`;

  const idx = await secFetchJson(indexUrl);

  // index.json structure: { directory: { item: [ { name, type, size, ... } ] } }
  const items: any[] = idx?.directory?.item || [];

  // candidates: all .xml
  const xmlFiles = items
    .map((x) => String(x?.name || ""))
    .filter((name) => name.toLowerCase().endsWith(".xml"));

  if (xmlFiles.length === 0) {
    throw new Error(`No XML files found in index.json for ${indexUrl}`);
  }

  // Prefer typical ownership xml file names first
  const preferredOrder = ["form4.xml", "primary_doc.xml", "doc1.xml"];

  const lower = (s: string) => s.toLowerCase();

  let chosen =
    xmlFiles.find((f) => preferredOrder.includes(lower(f))) ??
    // else pick one that contains "form4"
    xmlFiles.find((f) => lower(f).includes("form4")) ??
    // else just first xml
    xmlFiles[0];

  const xmlUrl = `${baseUrl}/${chosen}`;
  return { baseUrl, indexUrl, xmlUrl, xmlFilename: chosen };
}

app.get("/api/form4/xml-locate", async (req, res) => {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
        example:
          "/api/form4/xml-locate?cik=0000320193&accession=0000320193-24-000123",
      });
    }

    const out = await findForm4XmlUrl(cik, accession);
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Unknown error" });
  }
});

app.get("/api/form4/xml", async (req, res) => {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
        example: "/api/form4/xml?cik=0000320193&accession=0000320193-24-000123",
      });
    }

    const { xmlUrl, xmlFilename, baseUrl } = await findForm4XmlUrl(
      cik,
      accession,
    );
    const xmlText = await secFetchText(xmlUrl);

    // Send as XML so browser shows it nicely
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-EDGAR-Base", baseUrl);
    res.setHeader("X-EDGAR-XML-File", xmlFilename ?? "unknown.xml");

    res.send(xmlText);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Unknown error" });
  }
});

type ParsedTxn = {
  securityTitle?: string;
  transactionDate?: string;
  transactionCode?: string; // P/S
  acquiredDisposed?: string; //A or Q
  shares: number | undefined;
  price: number | undefined;
  totalValue: number | undefined;
  ownershipType?: string;
};

function toArray<T>(x: T | T[] | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function numOrUndef(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

app.get("/api/form4/details", async (req, res) => {
  try {
    const cik = String(req.query.cik || "");
    const accession = String(req.query.accession || "");
    if (!cik || !accession) {
      return res.status(400).json({
        error: "Missing required query params: cik, accession",
        example:
          "/api/form4/details?cik=0000320193&accession=0000320193-24-000123",
      });
    }

    const { xmlUrl } = await findForm4XmlUrl(cik, accession);
    const xmlText = await secFetchText(xmlUrl);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // SEC XML sometimes uses empty tags; keep them
      trimValues: true,
    });

    const doc = parser.parse(xmlText);

    // Form 4 XML typically has a root like: ownershipDocument
    const root = doc?.ownershipDocument ?? doc?.OwnershipDocument ?? doc;

    const issuerName = root?.issuer?.issuerName;
    const issuerTradingSymbol = root?.issuer?.issuerTradingSymbol;

    // reportingOwner section can be single or array
    const owners = toArray(root?.reportingOwner);
    const reportingOwners = owners.map((o: any) => ({
      name:
        o?.reportingOwnerId?.rptOwnerName ??
        o?.reportingOwnerId?.reportingOwnerName,
      cik:
        o?.reportingOwnerId?.rptOwnerCik ??
        o?.reportingOwnerId?.reportingOwnerCik,
      relationship: o?.reportingOwnerRelationship ?? {},
    }));

    // Transactions (Table I non-derivative)
    const nonDerivTable = root?.nonDerivativeTable;
    const nonDerivTxns = toArray(nonDerivTable?.nonDerivativeTransaction);

    const parsed: ParsedTxn[] = nonDerivTxns.map((t: any) => {
      const securityTitle = t?.securityTitle?.value;
      const transactionDate = t?.transactionDate?.value;
      const transactionCode = t?.transactionCoding?.transactionCode;
      const acquiredDisposed =
        t?.transactionAmounts?.transactionAcquiredDisposedCode?.value;
      const shares = numOrUndef(
        t?.transactionAmounts?.transactionShares?.value,
      );
      const price = numOrUndef(
        t?.transactionAmounts?.transactionPricePerShare?.value,
      );
      const ownershipType =
        t?.ownershipNature?.directOrIndirectOwnership?.value;

      const totalValue =
        shares !== undefined && price !== undefined
          ? shares * price
          : undefined;

      return {
        securityTitle,
        transactionDate,
        transactionCode,
        acquiredDisposed,
        shares,
        price,
        totalValue,
        ownershipType,
      };
    });

    // Basic summary: buys vs sells based on code or A/D
    const buys = parsed.filter(
      (x) => x.transactionCode === "P" || x.acquiredDisposed === "A",
    );
    const sells = parsed.filter(
      (x) => x.transactionCode === "S" || x.acquiredDisposed === "D",
    );

    res.json({
      cik,
      accession,
      sourceXml: xmlUrl,
      issuer: { issuerName, issuerTradingSymbol },
      reportingOwners,
      transactions: parsed,
      summary: {
        count: parsed.length,
        buys: buys.length,
        sells: sells.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Unknown error" });
  }
});

app.get("/api/form4/:ticker", async (req, res) => {
  try {
    const ticker = String(req.params.ticker).toUpperCase();
    const map = await getTickerMap();
    const row = map.find((x: any) => String(x.ticker).toUpperCase() === ticker);
    if (!row) return res.status(404).json({ error: "Ticker not found" });

    const cik10 = padCik(row.cik_str ?? row.cik);

    // Submissions endpoint documented by SEC
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik10}.json`;
    const subRes = await fetch(submissionsUrl, { headers: SEC_HEADERS });
    if (!subRes.ok)
      throw new Error(`Submissions fetch failed: ${subRes.status}`);
    const submissions = await subRes.json();

    const recent = submissions?.filings?.recent;
    if (!recent) return res.json({ ticker, cik: cik10, filings: [] });

    // These are parallel arrays in the “columnar” structure
    const forms: string[] = recent.form ?? [];
    const accessionNumbers: string[] = recent.accessionNumber ?? [];
    const filingDates: string[] = recent.filingDate ?? [];
    const primaryDocs: string[] = recent.primaryDocument ?? [];
    const reportDates: string[] = recent.reportDate ?? [];

    const out = [];
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      if (form === "4" || form === "4/A") {
        out.push({
          form,
          accessionNumber: accessionNumbers[i],
          filingDate: filingDates[i],
          reportDate: reportDates[i],
          primaryDocument: primaryDocs[i],
        });
      }
    }

    res.json({ ticker, cik: cik10, filings: out.slice(0, 25) });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Unknown error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
