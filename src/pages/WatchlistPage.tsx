import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FilingCard from "../components/FilingCard";
import {
  isBuy,
  fmtValue,
  transactionSentence,
} from "../components/FilingCard";
import type { Filing } from "../components/FilingCard";
import { BuySellBar, ActivitySparkline } from "../components/Charts";
import Tooltip, { TOOLTIPS } from "../components/Tooltip";

export default function WatchlistPage() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ticker, setTicker] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchFeed = useCallback(() => {
    fetch("/api/feed/watchlist", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load watchlist feed");
        return r.json();
      })
      .then((data) => setFilings(data.filings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleRemove = useCallback(async (companyId: number) => {
    const res = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId }),
    });
    if (res.ok) {
      setFilings((prev) => prev.filter((f) => f.company_id !== companyId));
    }
  }, []);

  async function handleAddTicker(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setAddError("");
    setAdding(true);
    try {
      const res = await fetch("/api/watchlist/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticker: ticker.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add ticker");
      }
      setTicker("");
      fetchFeed();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const watchedTickers = useMemo(() => getUniqueTickers(filings), [filings]);
  const companyStats = useMemo(() => computeCompanyStats(filings), [filings]);
  const globalStats = useMemo(() => computeGlobalStats(filings), [filings]);
  const activityData = useMemo(() => computeTimeline(filings), [filings]);

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const activitySectionRef = useRef<HTMLElement>(null);

  // Reset page when filings reload
  useEffect(() => { setPage(1); }, [filings]);

  const totalPages = Math.ceil(filings.length / PAGE_SIZE);
  const pagedFilings = useMemo(
    () => filings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filings, page],
  );

  return (
    <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Your Watchlist
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Track insider activity for the companies you care about.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleAddTicker} className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full bg-surface-container-high border-none focus:ring-1 focus:ring-primary/30 rounded-sm py-4 pl-12 pr-16 text-on-surface placeholder:text-on-surface-variant/40 transition-all"
            placeholder="Add a ticker to track (e.g. AAPL, MSFT, PLTR)..."
          />
          <button
            type="submit"
            disabled={adding}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">
              {adding ? "hourglass_top" : "add_circle"}
            </span>
          </button>
        </form>
        {addError && (
          <div className="flex items-center gap-2 text-xs text-error">
            <span className="material-symbols-outlined text-sm">error</span>
            {addError}
          </div>
        )}

        {/* Ticker pills */}
        {watchedTickers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {watchedTickers.map(({ ticker: t, companyId }) => (
              <div
                key={companyId}
                className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-sm border border-outline-variant/10 group"
              >
                <span className="text-xs font-bold text-on-surface">{t}</span>
                <button
                  onClick={() => handleRemove(companyId)}
                  className="text-on-surface-variant/40 group-hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2 block text-outline/40 animate-pulse">
            hourglass_top
          </span>
          Loading watchlist...
        </div>
      )}
      {error && <div className="text-center py-12 text-error">{error}</div>}

      {/* Empty state */}
      {!loading && !error && filings.length === 0 && (
        <div className="bg-surface-container rounded-sm p-12 text-center space-y-4">
          <span className="material-symbols-outlined text-5xl block text-outline/30">
            playlist_add
          </span>
          <h2 className="text-lg font-bold text-on-surface">
            Your watchlist is empty
          </h2>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            Add tickers above to start tracking insider activity. You'll see
            buy/sell signals, sentiment, and transaction summaries for each
            company.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-base">
                trending_up
              </span>
              See buying signals
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-base">
                trending_down
              </span>
              Track selling activity
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                insights
              </span>
              Get sentiment insights
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      {!loading && !error && filings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content: 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            {/* Company Summary Cards */}
            <section>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  dashboard
                </span>
                Company Summaries
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {companyStats.map((cs) => (
                  <CompanySummaryCard
                    key={cs.companyId}
                    stats={cs}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>

            {/* Recent Activity Feed */}
            <section ref={activitySectionRef}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">
                    bolt
                  </span>
                  Recent Activity
                  {totalPages > 1 && (
                    <span className="normal-case tracking-normal font-normal text-outline/60">
                      — page {page} of {totalPages}
                    </span>
                  )}
                </h2>
                <span className="text-[10px] text-on-surface-variant tabular-nums">
                  {filings.length} filing{filings.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-1 bg-surface-container-high/30 rounded-sm overflow-hidden border border-outline-variant/5">
                {pagedFilings.map((f) => (
                  <FilingCard
                    key={f.filing_id}
                    filing={f}
                    variant="feed"
                    onUnwatch={handleRemove}
                    watchedIds={
                      new Set(watchedTickers.map((t) => t.companyId))
                    }
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-on-surface-variant tabular-nums">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filings.length)} of {filings.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <WlPaginationBtn
                      icon="first_page"
                      label="First page"
                      disabled={page === 1}
                      onClick={() => { setPage(1); activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    />
                    <WlPaginationBtn
                      icon="chevron_left"
                      label="Previous page"
                      disabled={page === 1}
                      onClick={() => { setPage((p) => p - 1); activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    />
                    <div className="flex items-center gap-0.5">
                      {buildWlPageWindow(page, totalPages).map((item, i) =>
                        item === "…" ? (
                          <span key={`e-${i}`} className="px-1 text-xs text-outline/50">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => { setPage(item as number); activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                            className={`min-w-[28px] h-7 rounded-sm text-xs font-bold transition-all ${
                              item === page
                                ? "bg-primary text-on-primary"
                                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>
                    <WlPaginationBtn
                      icon="chevron_right"
                      label="Next page"
                      disabled={page === totalPages}
                      onClick={() => { setPage((p) => p + 1); activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    />
                    <WlPaginationBtn
                      icon="last_page"
                      label="Last page"
                      disabled={page === totalPages}
                      onClick={() => { setPage(totalPages); activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: 4 cols */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Overview stats */}
            <div className="bg-surface-container rounded-sm p-5 space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
                Watchlist Overview
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-high p-3 rounded-sm">
                  <p className="text-[10px] text-on-surface-variant uppercase">
                    Companies
                  </p>
                  <p className="text-xl font-black tracking-tighter text-on-surface tnum">
                    {watchedTickers.length}
                  </p>
                </div>
                <div className="bg-surface-container-high p-3 rounded-sm">
                  <p className="text-[10px] text-on-surface-variant uppercase">
                    Filings
                  </p>
                  <p className="text-xl font-black tracking-tighter text-on-surface tnum">
                    {filings.length}
                  </p>
                </div>
              </div>

              {/* Sentiment gauge */}
              <div className="bg-surface-container-high p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-on-surface-variant uppercase">
                    Overall Sentiment
                  </p>
                  <Tooltip
                    content={
                      globalStats.buys > globalStats.sells
                        ? TOOLTIPS.bullish
                        : TOOLTIPS.bearish
                    }
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-help">
                      info
                    </span>
                  </Tooltip>
                </div>
                <p
                  className={`text-lg font-black ${
                    globalStats.buys > globalStats.sells
                      ? "text-tertiary"
                      : globalStats.buys === globalStats.sells
                        ? "text-on-surface-variant"
                        : "text-error"
                  }`}
                >
                  {globalStats.buys > globalStats.sells
                    ? "Bullish"
                    : globalStats.buys === globalStats.sells
                      ? "Neutral"
                      : "Bearish"}
                </p>
                {globalStats.buys + globalStats.sells > 0 && (
                  <div className="mt-2 h-1.5 bg-surface-container-lowest rounded-full overflow-hidden flex">
                    <div
                      className="bg-tertiary rounded-full"
                      style={{
                        width: `${(globalStats.buys / (globalStats.buys + globalStats.sells)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-error rounded-full"
                      style={{
                        width: `${(globalStats.sells / (globalStats.buys + globalStats.sells)) * 100}%`,
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-tertiary font-bold tnum">
                    {globalStats.buys} buys
                  </span>
                  <span className="text-error font-bold tnum">
                    {globalStats.sells} sells
                  </span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <BuySellBar buys={globalStats.buys} sells={globalStats.sells} />
            <ActivitySparkline data={activityData} />

          </aside>
        </div>
      )}
    </main>
  );
}

/* ── Company Summary Card ── */

type CompanyStatsData = {
  companyId: number;
  ticker: string;
  companyName: string;
  filingCount: number;
  buys: number;
  sells: number;
  totalValue: number;
  latestSentence: string;
};

function CompanySummaryCard({
  stats,
  onRemove,
}: {
  stats: CompanyStatsData;
  onRemove: (id: number) => void;
}) {
  const total = stats.buys + stats.sells;
  const buyPct = total > 0 ? Math.round((stats.buys / total) * 100) : 0;
  const isBullish = stats.buys > stats.sells;

  return (
    <div className="bg-surface-container rounded-sm p-4 space-y-3 hover:ring-1 hover:ring-outline-variant/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isBullish ? "bg-tertiary" : total === 0 ? "bg-outline" : "bg-error"}`}
          />
          <span className="font-bold text-on-surface text-sm">
            {stats.ticker}
          </span>
        </div>
        <button
          onClick={() => onRemove(stats.companyId)}
          className="text-on-surface-variant/30 hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <p className="text-xs text-on-surface-variant truncate">
        {stats.companyName}
      </p>

      {/* Buy vs Sell ratio bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
            <div
              className="bg-tertiary rounded-full transition-all"
              style={{ width: `${buyPct}%` }}
            />
            <div
              className="bg-error rounded-full transition-all"
              style={{ width: `${100 - buyPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-tertiary font-bold tnum">
              {stats.buys} buy{stats.buys !== 1 ? "s" : ""}
            </span>
            <span className="text-error font-bold tnum">
              {stats.sells} sell{stats.sells !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-on-surface-variant">
          {stats.filingCount} filing{stats.filingCount !== 1 ? "s" : ""}
        </span>
        {stats.totalValue > 0 && (
          <span className="font-bold text-on-surface tnum">
            {fmtValue(stats.totalValue)} total
          </span>
        )}
      </div>

      {/* Latest activity sentence */}
      {stats.latestSentence && (
        <p className="text-[11px] text-on-surface-variant leading-relaxed border-t border-outline-variant/10 pt-2">
          {stats.latestSentence}
        </p>
      )}
    </div>
  );
}

/* ── Pagination helpers ── */

function WlPaginationBtn({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all disabled:opacity-25 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
    </button>
  );
}

function buildWlPageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    pages.add(i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

/* ── Helpers ── */

function getUniqueTickers(filings: Filing[]) {
  const seen = new Map<number, string>();
  for (const f of filings) {
    if (!seen.has(f.company_id)) seen.set(f.company_id, f.ticker);
  }
  return Array.from(seen.entries()).map(([companyId, ticker]) => ({
    companyId,
    ticker,
  }));
}

function computeCompanyStats(filings: Filing[]): CompanyStatsData[] {
  const map = new Map<number, CompanyStatsData>();

  for (const f of filings) {
    let cs = map.get(f.company_id);
    if (!cs) {
      cs = {
        companyId: f.company_id,
        ticker: f.ticker,
        companyName: f.company_name,
        filingCount: 0,
        buys: 0,
        sells: 0,
        totalValue: 0,
        latestSentence: "",
      };
      map.set(f.company_id, cs);
    }
    cs.filingCount++;

    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) cs.buys++;
      else cs.sells++;
      cs.totalValue += Math.abs(t.totalValue || 0);
    }

    // Set latest sentence from first transaction of first filing
    if (!cs.latestSentence && f.transactions?.[0]) {
      cs.latestSentence = transactionSentence(f.transactions[0], f.ticker);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.filingCount - a.filingCount);
}

function computeGlobalStats(filings: Filing[]) {
  let buys = 0;
  let sells = 0;
  for (const f of filings) {
    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) buys++;
      else sells++;
    }
  }
  return { buys, sells };
}

function computeTimeline(filings: Filing[]) {
  // Always produce the last 7 days ending today, zero-filled so gaps still
  // render. Uses LOCAL date strings (YYYY-MM-DD) — using toISOString() here
  // would shift buckets by one day in any timezone west of UTC, hiding
  // filings on April 13 / 14 / etc.
  const DAYS = 7;
  const dayMap = new Map<string, { buys: number; sells: number }>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayMap.set(toLocalDateKey(d), { buys: 0, sells: 0 });
  }

  for (const f of filings) {
    const day = f.filing_date?.slice(0, 10);
    if (!day || !dayMap.has(day)) continue;
    const entry = dayMap.get(day)!;
    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) entry.buys++;
      else entry.sells++;
    }
  }

  return Array.from(dayMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
