import { pool } from "../db/pool.js";
import * as sec from "./sec.service.js";
import { sleep } from "../utils/sleep.js";

export async function getOrFetchFiling(ticker: string, cik: string) {
  const { name, filings } = await sec.getRecentForm4Filings(ticker, cik);

  // Step 1: upsert company in its own transaction
  const companyClient = await pool.connect();
  let companyId: string;
  try {
    await companyClient.query("BEGIN");
    const compIdQuery = await companyClient.query(
      "INSERT INTO companies (ticker,cik,name) VALUES ($1,$2,$3)" +
        " ON CONFLICT (cik) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [ticker, cik, name],
    );
    companyId = compIdQuery.rows[0].id;
    await companyClient.query("COMMIT");
  } catch (e) {
    await companyClient.query("ROLLBACK");
    throw e;
  } finally {
    companyClient.release();
  }

  // Step 2: fetch all known accession numbers for this company in one query
  const existing = await pool.query(
    "SELECT accession_no FROM form4_filings WHERE company_id = $1",
    [companyId],
  );
  const existingSet = new Set(existing.rows.map((r) => r.accession_no));

  // Step 3: loop filings — check in memory, no DB round trip
  for (const filing of filings) {
    if (existingSet.has(filing.accessionNumber)) continue;

    // New filing — delay before hitting EDGAR
    await sleep(125);

    // Each filing gets its own transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const fileTrxn = await sec.getForm4Details(cik, filing.accessionNumber);
      const fileTrxnJson = JSON.stringify(fileTrxn);

      const fileFilingQuery = await client.query(
        "INSERT INTO form4_filings (company_id,accession_no,form_type,filing_date,period_of_report,parsed_json)" +
          " VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (accession_no) DO UPDATE SET form_type = EXCLUDED.form_type RETURNING filing_id",
        [
          companyId,
          filing.accessionNumber,
          filing.form,
          filing.filingDate,
          filing.reportDate || null,
          fileTrxnJson,
        ],
      );
      const filingId = fileFilingQuery.rows[0].filing_id;

      for (const trxn of fileTrxn.transactions) {
        await client.query(
          "INSERT INTO form4_transactions " +
            "(filing_id,security_title,transaction_date,transaction_code,acquired_disposed,shares," +
            "price_per_share,value_total,shares_owned_after,ownership_nature,owner_name,owner_title) " +
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [
            filingId,
            trxn.securityTitle,
            trxn.transactionDate || null,
            trxn.transactionCode,
            trxn.acquiredDisposed,
            trxn.shares,
            trxn.price,
            trxn.totalValue,
            trxn.sharesAfter,
            trxn.ownershipType,
            fileTrxn.reportingOwners[0]?.name ?? "",
            fileTrxn.reportingOwners[0]?.relationship?.officerTitle ?? "",
          ],
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`Failed to insert filing ${filing.accessionNumber}:`, e);
    } finally {
      client.release();
    }
  }
}
