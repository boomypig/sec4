# Insider Track

> SEC Insider Trading Dashboard

A full-stack web app that aggregates SEC Form 4 insider trading filings into a clean, personalized, real-time dashboard. When corporate insiders buy or sell their own company's stock they must file a Form 4 with the SEC. This app pulls that public data from EDGAR, stores it in PostgreSQL, and surfaces it through a modern React dashboard with watchlist management, sentiment charts, and paginated filing feeds.

**Author:** Bryan Lopez Rosales

**Live:** [https://sec4-client.onrender.com](https://sec4-client.onrender.com)

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | React + TypeScript + Vite (port 5173)                   |
| Styling      | Tailwind CSS + Material Symbols (Google Fonts)          |
| Routing      | React Router v6 (`useSearchParams` for pagination)      |
| Backend      | Node.js + Express + TypeScript (port 3001)              |
| Database     | PostgreSQL (db: sec4)                                   |
| Auth         | bcrypt + JWT in HttpOnly cookies                        |
| Scheduler    | node-cron (hourly EDGAR sync)                           |
| XML Parsing  | fast-xml-parser                                         |
| Deployment   | Render (static site + web service + managed PostgreSQL) |

---

## Project Structure

```
sec4/
  public/
    _redirects                   # SPA catch-all: /* /index.html 200 (Render)
  server/                        # Express backend
    sql/
      001_init.sql               # DB schema
    src/
      controllers/
        auth.controller.ts       # register, login, logout, getMe
        feed.controller.ts       # recent feed + watchlist feed
        form4.controller.ts      # EDGAR API endpoints
        watchlist.controller.ts  # watchlist CRUD + add-by-ticker
      db/
        pool.ts                  # PostgreSQL connection pool
      middleware/
        auth.middleware.ts       # JWT verification
      routes/
        auth.routes.ts           # /auth/*
        feed.routes.ts           # /api/feed/*
        form4.routes.ts          # /api/*
        health.routes.ts         # /health
        watchlist.routes.ts      # /api/watchlist/*
      services/
        sec.service.ts           # EDGAR fetch + XML parse
        filing.service.ts        # getOrFetchFiling — dedup + store
        scheduler.service.ts     # hourly cron sync
      utils/
        sleep.ts                 # shared rate limit utility
      index.ts                   # Express app entry point
  src/                           # React frontend
    components/
      Charts.tsx                 # BuySellBar + ActivitySparkline (pure SVG)
      FilingCard.tsx             # Feed card + Watchlist card + info collapsible
      FilterBar.tsx              # Direction / min-value / time-range filters
      HowItWorks.tsx             # Onboarding explainer shown to logged-out users
      InsightSummary.tsx         # Stats grid: buys, sells, values, top companies
      Navbar.tsx                 # Top nav with auth state
      ProtectedRoute.tsx         # Redirects to /login if unauthenticated
      Tooltip.tsx                # Hover tooltip + pre-built TOOLTIPS constants
    context/
      AuthContext.tsx            # Auth state, login/logout/register helpers
    lib/
      api.ts                     # apiUrl() — prepends VITE_API_URL in production
    pages/
      DashboardFeed.tsx          # Public feed: all filings, filters, pagination
      Form4Page.tsx              # Single filing detail view
      LoginPage.tsx              # Sign-in form
      RegisterPage.tsx           # Account creation form
      WatchlistPage.tsx          # Protected: personal company feed + pagination
    App.tsx
    main.tsx
```

---

## Environment Variables

### Backend (set in Render dashboard or `.env`)

| Variable       | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string (Render external URL)               |
| `JWT_SECRET`   | Long random hex string used to sign JWTs                         |
| `USER_AGENT`   | Value for `User-Agent` header on EDGAR requests                  |
| `NODE_ENV`     | `production` enables secure cookies and tightens CORS            |
| `FRONTEND_URL` | Allowed CORS origin in production (e.g. `https://…onrender.com`) |
| `PORT`         | HTTP port — defaults to `3001`                                   |

### Frontend (Vite build-time)

| Variable        | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| `VITE_API_URL`  | Backend base URL in production (e.g. `https://sec4-server.onrender.com`). Empty string in local dev — Vite proxy handles it. |

---

## API Routes

### Auth — `/auth`

| Method | Path             | Auth       | Description                                                           |
| ------ | ---------------- | ---------- | --------------------------------------------------------------------- |
| POST   | `/auth/register` | Public     | Hash password with bcrypt, store user                                 |
| POST   | `/auth/login`    | Public     | Verify hash, issue JWT as HttpOnly cookie                             |
| POST   | `/auth/logout`   | Public     | Clear the auth cookie server-side (required — cookie is HttpOnly)     |
| GET    | `/auth/me`       | JWT Cookie | Return current user id + email. Called on app load to restore session |

### Feed — `/api/feed`

| Method | Path                    | Auth       | Description                                                      |
| ------ | ----------------------- | ---------- | ---------------------------------------------------------------- |
| GET    | `/api/feed/recent`      | Public     | Up to 500 most recent filings across all companies               |
| GET    | `/api/feed/watchlist`   | JWT Cookie | Filings for companies on the current user's watchlist (up to 500)|

### SEC Data — `/api`

| Method | Path                    | Auth   | Description                                                     |
| ------ | ----------------------- | ------ | --------------------------------------------------------------- |
| GET    | `/api/cik/:ticker`      | Public | Resolve ticker to SEC CIK via EDGAR company_tickers.json        |
| GET    | `/api/form4/:ticker`    | Public | Fetch up to 25 recent Form 4 filings from EDGAR submissions API |
| GET    | `/api/form4/details`    | Public | Parse full Form 4 XML — returns transactions, owners, summary   |
| GET    | `/api/form4/xml`        | Public | Return raw Form 4 XML text                                      |
| GET    | `/api/form4/xml-locate` | Public | Return URL of XML file inside an EDGAR filing index             |

### Watchlist — `/api/watchlist`

> All watchlist routes require a valid JWT cookie

| Method | Path                     | Description                                          |
| ------ | ------------------------ | ---------------------------------------------------- |
| GET    | `/api/watchlist`         | Return all companies on the current user's watchlist |
| POST   | `/api/watchlist`         | Add a company by `companyId`                         |
| DELETE | `/api/watchlist`         | Remove a company by `companyId`                      |
| POST   | `/api/watchlist/ticker`  | Resolve a ticker symbol and add it to the watchlist  |

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

> **Note on empty transactions:** The ingestor only parses `nonDerivativeTable` rows. Filings that contain only derivative activity (options, RSUs) or are holdings-only amendments will have zero rows in `form4_transactions`. This is expected data, not a bug — the UI surfaces a plain-language explanation on those cards.

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
- **Cookie flags:** `httpOnly: true`, `secure: true` in production, `sameSite: none` (cross-origin Render deployment), 7-day expiry
- **Logout clears cookie server-side** — the only reliable way to expire an HttpOnly cookie. Client-side `document.cookie` cannot touch it
- **CORS:** `credentials: true` + explicit origin from `FRONTEND_URL` env var in production, `localhost:5173` in dev — no wildcard
- **User enumeration prevention:** same error message for wrong email and wrong password
- **Parameterized SQL queries everywhere** — prevents SQL injection
- **`verifyUser` applied at router level** in `index.ts`, not per-route — impossible to accidentally expose a protected route
- **bcrypt with 12 salt rounds** for password hashing

---

## Frontend

### Auth Flow

On app load React silently calls `GET /auth/me`. The browser automatically sends the HttpOnly cookie with the request. The server verifies it and responds with either the user's info (logged in) or a 401 (not logged in). React renders the correct view before the user sees anything. This is called an **auth check on mount**.

### Pages

| Page       | Route        | Auth      | Description                                                           |
| ---------- | ------------ | --------- | --------------------------------------------------------------------- |
| Login      | `/login`     | Public    | Sign in with email + password                                         |
| Register   | `/register`  | Public    | Create an account                                                     |
| Dashboard  | `/`          | Public    | All recent filings across all companies — filters, pagination, charts |
| Watchlist  | `/watchlist` | Protected | Personal feed for watched companies — pagination, sentiment sidebar   |

### Key Components

| Component        | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `FilingCard`     | Renders a single filing as a readable sentence. Includes a collapsible info panel (accession #, dates, copy-to-clipboard, EDGAR link) toggled by an info button next to the bookmark. Empty-transaction filings show an explanation instead of a blank card. |
| `InsightSummary` | Four-cell stats grid: Buy Activity, Sell Activity, Net Sentiment, Top Companies |
| `Charts`         | `BuySellBar` (SVG bar chart) + `ActivitySparkline` (stacked daily bar chart for the last 7 days, zero-filled so quiet days still appear) |
| `FilterBar`      | Client-side filters: direction (all/buy/sell), min transaction value, time range |
| `Tooltip`        | Hover tooltip — 352px wide, viewport-clamped so it never runs off-screen   |
| `ProtectedRoute` | Redirects to `/login` while `AuthContext` is loading, then gates on `user` |

### Pagination

Both the Dashboard and Watchlist use URL search params for page state (`?page=2`). This means:

- Browser **back/forward** buttons move between pages correctly
- Refreshing a paginated URL lands on the same page
- Filter changes reset to page 1 using `{ replace: true }` so the reset doesn't litter the history stack
- Dashboard: **10 company groups per page** (groups contain all filings for that company)
- Watchlist: **15 filings per page**

### Activity Over Time Chart

The chart always covers the **last 7 calendar days** regardless of which page of filings is displayed. Days are built from local time (not UTC) to avoid off-by-one errors in non-UTC timezones. Zero-filled buckets ensure every day of the week renders a bar even if there was no activity.

### `apiUrl` Utility

All `fetch` calls go through `src/lib/api.ts`:

```ts
export const API_URL = import.meta.env.VITE_API_URL ?? "";
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
```

In local dev `VITE_API_URL` is unset — calls are relative and Vite proxies them to `localhost:3001`. In production it equals `https://sec4-server.onrender.com`, so every call reaches the backend service directly.

### State Management

- `AuthContext` wraps the app and calls `/auth/me` on mount
- Provides `user` (`{ userId, email }`), `loading`, `login`, `register`, `logout`
- No auth state in localStorage — identity comes entirely from the HttpOnly cookie
- Watchlist IDs cached in component state and updated optimistically on watch/unwatch

---

## Deployment (Render)

| Service    | Type           | URL                                  |
| ---------- | -------------- | ------------------------------------ |
| Frontend   | Static Site    | `https://sec4-client.onrender.com`   |
| Backend    | Web Service    | `https://sec4-server.onrender.com`   |
| Database   | PostgreSQL     | Render managed instance              |

### SPA Routing Fix

`public/_redirects` contains a single catch-all rule:

```
/* /index.html 200
```

Without this, refreshing any client-side route (e.g. `/watchlist`) on Render's static host returns a 404 because there is no static file at that path. Vite copies the `public/` directory verbatim into `dist/` on every build.

### Cookie `sameSite: none`

Because the frontend and backend are on different Render subdomains (cross-origin), cookies must use `sameSite: none; Secure`. This is set conditionally in `auth.controller.ts` when `NODE_ENV === production`.
