// server/src/scripts/seedCompanies.ts
// Run once manually: npx tsx src/scripts/seedCompanies.ts
// Requires company_tickers.json in the same directory
// Download from: https://www.sec.gov/files/company_tickers.json

import { pool } from "../src/db/pool.js";
import data from "./company_tickers.json" with { type: "json" };

type CompanyEntry = {
  cik_str: number;
  ticker: string;
  title: string;
};

// Helper: pause execution for ms milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: split an array into chunks of size n
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function seed() {
  // Object.values turns {"0": {...}, "1": {...}} into [{...}, {...}]
  const allCompanies = Object.values(data) as CompanyEntry[];
  const top500 = allCompanies.slice(0, 500);
  const chunks = chunkArray(top500, 5); // 5 companies per batch

  console.log(
    `Seeding ${top500.length} companies in ${chunks.length} batches...`,
  );

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Run all 5 inserts in this chunk in parallel
    await Promise.all(
      chunk.map(async (company) => {
        const paddedCik = String(company.cik_str).padStart(10, "0");
        const result = await pool.query(
          `INSERT INTO companies (ticker, cik, name)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [company.ticker.toUpperCase(), paddedCik, company.title],
        );
        if (result.rowCount === 0) {
          skipped++;
        } else {
          inserted++;
        }
      }),
    );

    console.log(`Batch ${i + 1}/${chunks.length} done`);

    // Wait 1 second between batches to respect SEC rate limits
    // Skip the wait after the last batch
    if (i < chunks.length - 1) {
      await sleep(1000);
    }
  }

  console.log(
    `Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`,
  );
  await pool.end(); // close DB connections so the script exits cleanly
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
