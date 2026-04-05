# Form 4 Tracker

> SEC Insider Trading Dashboard & Alert System

A full-stack web app that aggregates SEC Form 4 insider trading filings into a clean, personalized, real-time dashboard. When corporate insiders buy or sell their own company's stock they must file a Form 4 with the SEC. This app pulls that public data from EDGAR, stores it in PostgreSQL, and surfaces it through a modern React dashboard with watchlist management.

**Author:** Bryan Lopez Rosales

---

## Tech Stack

| Layer       | Technology                                 |
| ----------- | ------------------------------------------ |
| Frontend    | React + TypeScript + Vite (port 5173)      |
| Backend     | Node.js + Express + TypeScript (port 3001) |
| Database    | PostgreSQL (db: sec4)                      |
| Auth        | bcrypt + JWT in HttpOnly cookies           |
| Scheduler   | node-cron (hourly EDGAR sync)              |
| XML Parsing | fast-xml-parser                            |

---

## Project Structure

```
sec4/
  server/                        # Express backend
    sql/
      001_init.sql               # DB schema
    src/
      controllers/
        auth.controller.ts       # register, login, getMe
        form4.controller.ts      # EDGAR API endpoints
        watchlist.controller.ts  # watchlist CRUD
      db/
        pool.ts                  # PostgreSQL connection pool
      middleware/
        auth.middleware.ts       # JWT verification
      routes/
        auth.routes.ts           # /auth/*
        form4.routes.ts          # /api/*
        health.routes.ts         # /health
        watchlist.routes.ts      # /watchlist/*
      services/
        sec.service.ts           # EDGAR fetch + XML parse
        filing.service.ts        # getOrFetchFiling — dedup + store
        scheduler.service.ts     # hourly cron sync
      utils/
        sleep.ts                 # shared rate limit utility
      index.ts                   # Express app entry point
  src/                           # React frontend
    pages/
    App.tsx
    main.tsx
```

---

## API Routes

### Auth — `/auth`

| Method | Path             | Auth       | Description                                                           |
| ------ | ---------------- | ---------- | --------------------------------------------------------------------- |
| POST   | `/auth/register` | Public     | Hash password with bcrypt, store user                                 |
| POST   | `/auth/login`    | Public     | Verify hash, issue JWT as HttpOnly cookie                             |
| GET    | `/auth/me`       | JWT Cookie | Return current user id + email. Called on app load to restore session |

### SEC Data — `/api`

| Method | Path                    | Auth   | Description                                                     |
| ------ | ----------------------- | ------ | --------------------------------------------------------------- |
| GET    | `/api/cik/:ticker`      | Public | Resolve ticker to SEC CIK via EDGAR company_tickers.json        |
| GET    | `/api/form4/:ticker`    | Public | Fetch up to 25 recent Form 4 filings from EDGAR submissions API |
| GET    | `/api/form4/details`    | Public | Parse full Form 4 XML — returns transactions, owners, summary   |
| GET    | `/api/form4/xml`        | Public | Return raw Form 4 XML text                                      |
| GET    | `/api/form4/xml-locate` | Public | Return URL of XML file inside an EDGAR filing index             |

### Watchlist — `/watchlist`

> All watchlist routes require a valid JWT cookie

| Method | Path         | Description                                          |
| ------ | ------------ | ---------------------------------------------------- |
| GET    | `/watchlist` | Return all companies on the current user's watchlist |
| POST   | `/watchlist` | Add a company by companyId                           |
| DELETE | `/watchlist` | Remove a company by companyId                        |

### Health

| Method | Path      | Description                              |
| ------ | --------- | ---------------------------------------- |
| GET    | `/health` | Ping the DB and return current timestamp |

---

## Database Schema

### `users`

| Column        | Type                 | Notes                  |
| ------------- | -------------------- | ---------------------- |
| id            | UUID                 | PK, gen_random_uuid()  |
| email         | TEXT NOT NULL UNIQUE | Login email            |
| password_hash | TEXT NOT NULL        | bcrypt, 12 salt rounds |
| created_at    | TIMESTAMPTZ NOT NULL | Defaults to now()      |

### `companies`

| Column     | Type                 | Notes                                    |
| ---------- | -------------------- | ---------------------------------------- |
| id         | UUID                 | PK                                       |
| ticker     | TEXT NOT NULL UNIQUE | e.g. AAPL. Case-insensitive unique index |
| cik        | TEXT NOT NULL UNIQUE | 10-digit padded SEC CIK                  |
| name       | TEXT NOT NULL        | Company name from EDGAR                  |
| created_at | TIMESTAMPTZ NOT NULL | Defaults to now()                        |

### `watchlists`

| Column     | Type                 | Notes                                    |
| ---------- | -------------------- | ---------------------------------------- |
| user_id    | UUID FK NOT NULL     | References users(id), CASCADE delete     |
| company_id | UUID FK NOT NULL     | References companies(id), CASCADE delete |
| created_at | TIMESTAMPTZ NOT NULL | Defaults to now()                        |

Composite PK on `(user_id, company_id)`. Indexed on both columns.

### `form4_filings`

| Column           | Type                 | Notes                                      |
| ---------------- | -------------------- | ------------------------------------------ |
| filing_id        | UUID                 | PK                                         |
| company_id       | UUID FK NOT NULL     | References companies(id)                   |
| accession_no     | TEXT NOT NULL UNIQUE | EDGAR accession number — deduplication key |
| form_type        | TEXT NOT NULL        | `4` or `4/A` (amendment)                   |
| filing_date      | TIMESTAMPTZ          | Nullable — EDGAR sometimes omits           |
| period_of_report | TIMESTAMPTZ          | Nullable — EDGAR sometimes omits           |
| parsed_json      | JSON NOT NULL        | Full parsed filing stored as JSON          |

### `form4_transactions`

| Column             | Type             | Notes                                                    |
| ------------------ | ---------------- | -------------------------------------------------------- |
| transaction_id     | UUID             | PK                                                       |
| filing_id          | UUID FK NOT NULL | References form4_filings(filing_id)                      |
| security_title     | TEXT             | e.g. Common Stock                                        |
| transaction_date   | TIMESTAMPTZ      | Nullable                                                 |
| transaction_code   | TEXT             | P=Purchase, S=Sale, M=Option exercise, F=Tax withholding |
| acquired_disposed  | TEXT             | A=Acquired, D=Disposed                                   |
| shares             | NUMERIC(20,4)    | Widened from (15,4) to handle large holders              |
| price_per_share    | NUMERIC(20,4)    |                                                          |
| value_total        | NUMERIC(20,4)    | shares × price_per_share                                 |
| shares_owned_after | NUMERIC(20,4)    |                                                          |
| ownership_nature   | TEXT             | D=Direct, I=Indirect                                     |
| owner_name         | TEXT NOT NULL    | Reporting owner full name                                |
| owner_title        | TEXT             | e.g. CEO, CFO, Director                                  |

---

## Scheduler

The hourly scheduler syncs all 500 seeded companies with EDGAR. It runs immediately on server boot, then every hour via cron (`0 * * * *`).

### Rate Limiting

- EDGAR public API limit: **10 requests/second**
- Scheduler uses **8 requests/second** (125ms delay between companies) for a safety margin
- Additional 125ms delay between each new filing fetch — each new filing costs 2 requests (index.json + XML)

### Sync Algorithm

```
1. Query DB → SELECT ticker, cik, name FROM companies
2. For each company:
   a. Upsert company in its own transaction → get company_id
   b. Fetch all known accession_nos for that company in ONE query → Set
   c. Loop filings → Set.has() check is O(1), no DB round trip per filing
   d. For each new filing → fetch XML, parse, insert in its own transaction
   e. sleep(125ms) before next company
```

### Why separate transactions per filing?

If a filing insert fails, only that filing rolls back. The company record and all previously inserted filings for that company are safe. Without this, one bad filing would roll back everything.

### Complexity

- **O(n²)** — companies × filings. Set lookup is O(1).
- DB queries reduced from **12,500** (one per filing) to **1,000** (two per company)
- First full run: **499/500** succeeded — 1 failure was EONGY (pre-XML EDGAR filing from 2001, not a code bug)
- First run loaded: **9,438 filings** and **20,957 transactions** in ~30 minutes

---

## Security Decisions

- **JWT in HttpOnly cookie** — not localStorage. JavaScript cannot read it, preventing XSS token theft
- **Cookie flags:** `httpOnly: true`, `secure: true` in production, `sameSite: lax`, 7 day expiry
- **CORS:** `credentials: true` + explicit origin `localhost:5173` — no wildcard
- **User enumeration prevention:** same error message for wrong email and wrong password
- **Parameterized SQL queries everywhere** — prevents SQL injection
- **`verifyUser` applied at router level** in `index.ts`, not per-route — impossible to accidentally expose a protected route
- **bcrypt with 12 salt rounds** for password hashing

---

## Frontend Plan

### Auth Flow

On app load React silently calls `GET /auth/me`. The browser automatically sends the HttpOnly cookie with the request. The server verifies it and responds with either the user's info (logged in) or a 401 (not logged in). React renders the correct view before the user sees anything. This is called an **auth check on mount**.

### Pages

| Page             | Auth      | Description                                                         |
| ---------------- | --------- | ------------------------------------------------------------------- |
| Login / Register | Public    | Create account or sign in                                           |
| Feed             | Public    | All recent transactions across all companies, reverse-chronological |
| Company          | Public    | Filings and transactions for a single company                       |
| Watchlist        | Protected | Personal filtered feed for watched companies                        |

### State Management

- `AuthContext` wraps the app and calls `/auth/me` on mount
- Provides `userId`, `email`, and `isLoggedIn` to all pages
- No auth state in localStorage — identity comes entirely from the HttpOnly cookie

---
