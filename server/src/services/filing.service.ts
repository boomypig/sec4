import { pool } from "../db/pool.js";
import * as sec from "./sec.service.js";

export async function getOrFetchFiling(ticker: string) {
  const {name,cik,filings} = await sec.getRecentForm4FilingsByTicker(ticker);
  console.log(name)
  for (const filing of filings) {
    // check if this accession number already exists in form4_filings
    // if it exists → skip
    // if it doesn't → fetch, parse, store
    const result = await pool.query(
      "SELECT accession_no FROM form4_filings WHERE accession_no = $1",
      [filing.accessionNumber],
    );

    // ^^ checks if we have the filing in our filings table
    console.log("rows:", result.rows);
    console.log("row count:", result.rows.length);
    if (result.rows.length === 0) {
      //In here check if the company exists in our companies table
      //if it does then were fine to insert filing into filings table with company id foriegn key
      //if the company doesn't exist grab company name and cik and insert into companies table
      //Then insert new filing with that company id 
      // filing doesn't exist in our DB yet
      // fetch, parse, store
      console.log("before compid query")
      //grab companyId from companies table
      const compIdQuery = await pool.query("INSERT INTO companies (ticker,cik,name) VALUES ($1,$2,$3)"
        +" ON CONFLICT (cik) DO UPDATE SET name = EXCLUDED.name RETURNING id"  ,[ticker,cik,name])
        const companyId = compIdQuery.rows[0].id

        const fileTrxn = await sec.getForm4Details(cik,filing.accessionNumber)
        const fileTrxnJson:string = JSON.stringify(fileTrxn)
        console.log(fileTrxn)
        console.log("transaction within file", fileTrxn.transactions)

        const fileFilingQuery = await pool.query(
          "INSERT INTO form4_filings (company_id,accession_no,form_type,filing_date,period_of_report,parsed_json)"
          +" VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (accession_no) DO UPDATE SET form_type = EXCLUDED.form_type RETURNING filing_id",
          [companyId,filing.accessionNumber,filing.form,filing.filingDate,filing.reportDate,fileTrxnJson]
        )
        const filingId = fileFilingQuery.rows[0].filing_id
        console.log("filiing file query results",fileFilingQuery)

        for(const trxn of fileTrxn.transactions){

          // const insertTrxnQuery = await pool.query("INSERT INTO form4_transactions "+
          // "(filing_id,security_title,transaction_date,transaction_code,aquired_disposed,shares,price_per_share,value_total,shares_owned_after,ownership_nature,owner_title) "+
          // "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (filing_id) DO NOTHING"),[]
        }

    }
    continue;
  }
}






getOrFetchFiling("AAPL")