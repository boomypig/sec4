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
  cik TEXT,                             -- store padded CIK if you want
  name TEXT,
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