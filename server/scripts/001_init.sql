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
  cik TEXT NOT NULL UNIQUE  ,                    -- store padded CIK
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
  filing_date TIMESTAMPTZ,
  period_of_report TIMESTAMPTZ,
  parsed_json JSON NOT NULL
 );

 -- =========================
-- Form4Transaction
-- =========================
CREATE TABLE IF NOT EXISTS form4_transactions(
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES form4_filings(filing_id) ON DELETE CASCADE,
  security_title TEXT,
  transaction_date TIMESTAMPTZ,
  transaction_code TEXT,
  acquired_disposed TEXT,
  shares NUMERIC(25, 4),
  price_per_share NUMERIC(25, 4),
  value_total NUMERIC(25, 4),
  shares_owned_after NUMERIC(25, 4),
  ownership_nature TEXT,
  owner_name TEXT NOT NULL,
  owner_title TEXT
);

