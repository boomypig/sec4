import { pool } from "../db/pool.js";
import * as sec from "./sec.service.js";

export async function getOrFetchFiling(ticker: string) {
  const filings = await sec.getRecentForm4FilingsByTicker(ticker);
  for (const filing of filings.filings) {
    // check if this accession number already exists in form4_filings
    // if it exists → skip
    // if it doesn't → fetch, parse, store
    const result = await pool.query(
      "SELECT accession_no FROM form4_filings WHERE accession_no = $1",
      [filing.accessionNumber],
    );

    console.log(filing)
    console.log(result);
    console.log("rows:", result.rows);
    console.log("row count:", result.rows.length);
    if (result.rows.length === 0) {
      // filing doesn't exist in our DB yet
      // fetch, parse, store


    }
  }
}

getOrFetchFiling("AAPL")