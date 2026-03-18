-- server/sql/001_init.sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- users
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- companies (tickers you track)
-- =========================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,          -- e.g., AAPL
  cik TEXT NOT NULL,                    -- store padded CIK
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful for case-insensitive ticker lookups (AAPL vs aapl)
CREATE UNIQUE INDEX IF NOT EXISTS companies_ticker_upper_uq
  ON companies ((upper(ticker)));

-- =========================
-- watchlists (join table: users <-> companies)
-- =========================
CREATE TABLE IF NOT EXISTS watchlists (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS watchlists_company_id_idx ON watchlists(company_id);

-- =========================
-- form4Filings
-- =========================

 CREATE TABLE IF NOT EXISTS form4_filings(
  filing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  accession_no TEXT NOT NULL UNIQUE,
  form_type TEXT NOT NULL,
  filing_date TIMESTAMPTZ NOT NULL,
  period_of_report TIMESTAMPTZ NOT NULL,
  parsed_json JSON NOT NULL
 );

 -- =========================
-- Form4Transaction
-- =========================
CREATE TABLE IF NOT EXISTS form4_transactions(
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES form4_filings(filing_id) ON DELETE CASCADE,
  security_title TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  transaction_code TEXT NOT NULL,
  acquired_disposed TEXT NOT NULL,
  shares NUMERIC(15, 4) NOT NULL,
  price_per_share NUMERIC(15, 4) NOT NULL,
  value_total NUMERIC(15, 4) NOT NULL,
  shares_owned_after NUMERIC(15, 4) NOT NULL,
  ownership_nature TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_title TEXT NOT NULL
);

