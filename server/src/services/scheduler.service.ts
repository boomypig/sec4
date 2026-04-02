import cron from "node-cron";
import { pool } from "../db/pool.js";
import { getOrFetchFiling } from "./filing.service.js";
import { sleep } from "../utils/sleep.js";

export async function runScheduledSync() {
  const start = Date.now();
  console.log(`[scheduler] Run started at ${new Date().toISOString()}`);

  // Get every company we know about
  const { rows } = await pool.query("SELECT ticker, cik, name FROM companies");

  console.log(`[scheduler] Processing ${rows.length} companies...`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const company = rows[i];

    console.log(
      `[scheduler] (${i + 1}/${rows.length}) Processing ${company.ticker}...`,
    );

    try {
      await getOrFetchFiling(company.ticker, company.cik);
      succeeded++;
      console.log(`[scheduler] ✓ ${company.ticker}`);
    } catch (e) {
      console.error(`[scheduler] ✗ ${company.ticker}:`, (e as Error).message);
      failed++;
    }

    await sleep(125);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[scheduler] Done in ${elapsed}s — ${succeeded} succeeded, ${failed} failed`,
  );
}

export function startScheduler() {
  // Run once immediately when the server starts
  runScheduledSync();

  // Then run at the top of every hour: minute=0, every hour
  cron.schedule("0 * * * *", () => {
    runScheduledSync();
  });

  console.log("[scheduler] Hourly sync scheduled");
}
