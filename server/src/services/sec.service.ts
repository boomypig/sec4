import { XMLParser } from "fast-xml-parser";

const SEC_HEADERS = {
  "User-Agent": process.env.USER_AGENT!,
  "Accept-Encoding": "gzip, deflate",
};

function cik10ToIntString(cik10: string) {
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

// cache ticker map (1 day)
let tickerMapCache: any[] | null = null;
let tickerMapFetchedAt = 0;

async function getTickerMap() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (tickerMapCache && Date.now() - tickerMapFetchedAt < ONE_DAY)
    return tickerMapCache;

  const url = "https://www.sec.gov/files/company_tickers.json";
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ticker map: ${res.status}`);

  const data = (await res.json()) as any;
  const arr = Array.isArray(data) ? data : Object.values(data);

  tickerMapCache = arr;
  tickerMapFetchedAt = Date.now();
  return arr;
}

export async function getCikForTicker(tickerRaw: string) {
  const ticker = String(tickerRaw).toUpperCase();
  const map = await getTickerMap();
  const row = map.find((x: any) => String(x.ticker).toUpperCase() === ticker);
  if (!row) throw new Error("Ticker not found");
  return { ticker, cik: padCik(row.cik_str ?? row.cik) };
}

export async function findForm4XmlUrl(cik10: string, accession: string) {
  const baseUrl = filingBaseUrl(cik10, accession);
  const indexUrl = `${baseUrl}/index.json`;

  const idx = (await secFetchJson(indexUrl)) as any;
  const items: any[] = idx?.directory?.item || [];

  const xmlFiles = items
    .map((x) => String(x?.name || ""))
    .filter((name) => name.toLowerCase().endsWith(".xml"));

  if (xmlFiles.length === 0) {
    throw new Error(`No XML files found in index.json for ${indexUrl}`);
  }

  const preferredOrder = ["form4.xml", "primary_doc.xml", "doc1.xml"];
  const lower = (s: string) => s.toLowerCase();

  const chosen =
    xmlFiles.find((f) => preferredOrder.includes(lower(f))) ??
    xmlFiles.find((f) => lower(f).includes("form4")) ??
    xmlFiles[0];

  const xmlUrl = `${baseUrl}/${chosen}`;
  return { baseUrl, indexUrl, xmlUrl, xmlFilename: chosen };
}

export async function fetchForm4Xml(cik: string, accession: string) {
  const { xmlUrl, xmlFilename, baseUrl } = await findForm4XmlUrl(
    cik,
    accession,
  );
  const xmlText = await secFetchText(xmlUrl);
  return { xmlText, xmlUrl, xmlFilename, baseUrl };
}

type ParsedTxn = {
  securityTitle?: string;
  transactionDate?: string;
  transactionCode?: string;
  acquiredDisposed?: string;
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

export async function getForm4Details(cik: string, accession: string) {
  const { xmlText, xmlUrl } = await fetchForm4Xml(cik, accession);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });

  const doc = parser.parse(xmlText);
  const root = doc?.ownershipDocument ?? doc?.OwnershipDocument ?? doc;

  const issuerName = root?.issuer?.issuerName;
  const issuerTradingSymbol = root?.issuer?.issuerTradingSymbol;

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

  const nonDerivTable = root?.nonDerivativeTable;
  const nonDerivTxns = toArray(nonDerivTable?.nonDerivativeTransaction);

  const parsed: ParsedTxn[] = nonDerivTxns.map((t: any) => {
    const securityTitle = t?.securityTitle?.value;
    const transactionDate = t?.transactionDate?.value;
    const transactionCode = t?.transactionCoding?.transactionCode;
    const acquiredDisposed =
      t?.transactionAmounts?.transactionAcquiredDisposedCode?.value;
    const shares = numOrUndef(t?.transactionAmounts?.transactionShares?.value);
    const price = numOrUndef(
      t?.transactionAmounts?.transactionPricePerShare?.value,
    );
    const ownershipType = t?.ownershipNature?.directOrIndirectOwnership?.value;

    const totalValue =
      shares !== undefined && price !== undefined ? shares * price : undefined;

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

  const buys = parsed.filter(
    (x) => x.transactionCode === "P" || x.acquiredDisposed === "A",
  );
  const sells = parsed.filter(
    (x) => x.transactionCode === "S" || x.acquiredDisposed === "D",
  );

  return {
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
  };
}

export async function getRecentForm4FilingsByTicker(tickerRaw: string) {
  const { ticker, cik } = await getCikForTicker(tickerRaw);

  const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const subRes = await fetch(submissionsUrl, { headers: SEC_HEADERS });
  if (!subRes.ok) throw new Error(`Submissions fetch failed: ${subRes.status}`);
  const submissions = (await subRes.json()) as any;
  const recent = submissions?.filings?.recent;

  if (!recent) return { ticker, cik, filings: [] };

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

  return { ticker, cik, filings: out.slice(0, 25) };
}
