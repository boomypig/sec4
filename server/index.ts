import express from "express";
import "dotenv/config";

const app = express();
const PORT = Number(process.env.PORT);

// IMPORTANT: SEC endpoints require a descriptive User-Agent with contact info.
const SEC_HEADERS = {
  "User-Agent": process.env.USER_AGENT!,
  "Accept-Encoding": "gzip, deflate",
};

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
