import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FilingCard from "../components/FilingCard";
import { isBuy } from "../components/FilingCard";
import type { Filing } from "../components/FilingCard";
import InsightSummary from "../components/InsightSummary";
import FilterBar from "../components/FilterBar";
import type { FilterState } from "../components/FilterBar";
import { BuySellBar, ActivitySparkline } from "../components/Charts";
import HowItWorks from "../components/HowItWorks";
import { apiUrl } from "../lib/api";
export default function DashboardFeed() {
  const { user } = useAuth();

  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    direction: "all",
    minValue: 0,
    timeRange: "all",
  });
  const PAGE_SIZE = 10; // company groups per page
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  function goToPage(n: number) {
    setSearchParams(
      (prev) => { const next = new URLSearchParams(prev); next.set("page", String(n)); return next; },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    fetch(apiUrl("/api/feed/recent"))
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load feed");
        return r.json();
      })
      .then((data) => setFilings(data.filings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl("/api/watchlist"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.userCompanies) {
          setWatchedIds(
            new Set(data.userCompanies.map((c: any) => c.company_id)),
          );
        }
      })
      .catch(() => {});
  }, [user]);

  const handleWatch = useCallback(async (companyId: number) => {
    const res = await fetch(apiUrl("/api/watchlist"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId }),
    });
    if (res.ok) setWatchedIds((prev) => new Set(prev).add(companyId));
  }, []);

  const handleUnwatch = useCallback(async (companyId: number) => {
    const res = await fetch(apiUrl("/api/watchlist"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId }),
    });
    if (res.ok)
      setWatchedIds((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
  }, []);

  // Compute stats from all filings (unfiltered)
  const stats = useMemo(() => computeStats(filings), [filings]);

  // Activity over time data
  const activityData = useMemo(() => computeActivityTimeline(filings), [filings]);

  // Apply filters
  const filtered = useMemo(
    () => applyFilters(filings, filters),
    [filings, filters],
  );

  // Group filtered filings by company
  const grouped = useMemo(() => groupByCompany(filtered), [filtered]);

  // Reset to page 1 whenever filters or data change (replace so back button
  // doesn't land on a stale filter page)
  useEffect(() => {
    setSearchParams(
      (prev) => { const next = new URLSearchParams(prev); next.set("page", "1"); return next; },
      { replace: true },
    );
  }, [filters, filings]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(grouped.length / PAGE_SIZE);
  const pagedGroups = useMemo(
    () => grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [grouped, page, PAGE_SIZE],
  );

  // Range of filing dates on the current page (for display label)
  const pageFilingRange = useMemo(() => {
    const allDates = pagedGroups
      .flatMap((g) => g.filings.map((f) => f.filing_date?.slice(0, 10)))
      .filter(Boolean) as string[];
    if (allDates.length === 0) return null;
    allDates.sort();
    return { from: allDates[0], to: allDates[allDates.length - 1] };
  }, [pagedGroups]);

  return (
    <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Insider Activity
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Track what company insiders are buying and selling, decoded from SEC
            Form 4 filings.
          </p>
        </div>
      </section>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2 block text-outline/40 animate-pulse">
            hourglass_top
          </span>
          Loading insider activity...
        </div>
      )}
      {error && <div className="text-center py-20 text-error">{error}</div>}

      {/* Empty state with onboarding */}
      {!loading && !error && filings.length === 0 && (
        <div className="space-y-6">
          <div className="text-center py-16 bg-surface-container rounded-sm">
            <span className="material-symbols-outlined text-5xl mb-3 block text-outline/30">
              query_stats
            </span>
            <h2 className="text-lg font-bold text-on-surface mb-2">
              No insider activity yet
            </h2>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              The system is syncing data from SEC EDGAR. New filings will appear
              here automatically as they are processed.
            </p>
          </div>
          <HowItWorks isLoggedIn={!!user} />
        </div>
      )}

      {/* Main content (only when we have data) */}
      {!loading && !error && filings.length > 0 && (
        <>
          {/* 0. How it works — shown above the stats grid for logged-out users */}
          {!user && <HowItWorks isLoggedIn={false} />}

          {/* 1. Insight Summary */}
          <InsightSummary
            buys={stats.buys}
            sells={stats.sells}
            totalBuyValue={stats.totalBuyValue}
            totalSellValue={stats.totalSellValue}
            topCompanies={stats.topCompanies}
            filingCount={filings.length}
          />

          {/* 2. Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BuySellBar buys={stats.buys} sells={stats.sells} />
            <ActivitySparkline data={activityData} />
          </div>

          {/* 3. Filters */}
          <FilterBar filters={filters} onChange={setFilters} />

          {/* 4. Grouped filings */}
          <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  bolt
                </span>
                {filtered.length === filings.length
                  ? "All Insider Activity"
                  : `${filtered.length} of ${filings.length} filings`}
                {totalPages > 1 && (
                  <span className="normal-case tracking-normal font-normal text-outline/60">
                    — page {page} of {totalPages}
                  </span>
                )}
              </h2>
              {filters.direction !== "all" ||
              filters.minValue > 0 ||
              filters.timeRange !== "all" ? (
                <button
                  onClick={() =>
                    setFilters({ direction: "all", minValue: 0, timeRange: "all" })
                  }
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">
                    filter_alt_off
                  </span>
                  Clear filters
                </button>
              ) : null}
            </div>

            {filtered.length === 0 && (
              <div className="bg-surface-container-high rounded-sm p-12 text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block text-outline/30">
                  filter_alt
                </span>
                <p className="text-on-surface-variant text-sm">
                  No filings match your current filters. Try adjusting them
                  above.
                </p>
              </div>
            )}

            {/* Current page groups */}
            {pagedGroups.map((group) => (
              <CompanyGroup
                key={group.companyId}
                group={group}
                onWatch={handleWatch}
                onUnwatch={handleUnwatch}
                watchedIds={watchedIds}
              />
            ))}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                {/* Date range hint */}
                <span className="text-[10px] text-on-surface-variant tabular-nums">
                  {pageFilingRange
                    ? pageFilingRange.from === pageFilingRange.to
                      ? fmtShortDate(pageFilingRange.from)
                      : `${fmtShortDate(pageFilingRange.from)} – ${fmtShortDate(pageFilingRange.to)}`
                    : ""}
                </span>

                <div className="flex items-center gap-1">
                  {/* First */}
                  <PaginationBtn
                    icon="first_page"
                    label="First page"
                    disabled={page === 1}
                    onClick={() => goToPage(1)}
                  />
                  {/* Prev */}
                  <PaginationBtn
                    icon="chevron_left"
                    label="Previous page"
                    disabled={page === 1}
                    onClick={() => goToPage(page - 1)}
                  />

                  {/* Page numbers */}
                  <div className="flex items-center gap-0.5">
                    {buildPageWindow(page, totalPages).map((item, i) =>
                      item === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-outline/50">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goToPage(item as number)}
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

                  {/* Next */}
                  <PaginationBtn
                    icon="chevron_right"
                    label="Next page"
                    disabled={page === totalPages}
                    onClick={() => goToPage(page + 1)}
                  />
                  {/* Last */}
                  <PaginationBtn
                    icon="last_page"
                    label="Last page"
                    disabled={page === totalPages}
                    onClick={() => goToPage(totalPages)}
                  />
                </div>
              </div>
            )}
          </section>

        </>
      )}
    </main>
  );
}

/* ── Company Group component ── */

type CompanyGroupData = {
  companyId: number;
  ticker: string;
  companyName: string;
  filings: Filing[];
  buys: number;
  sells: number;
};

function CompanyGroup({
  group,
  onWatch,
  onUnwatch,
  watchedIds,
}: {
  group: CompanyGroupData;
  onWatch: (id: number) => void;
  onUnwatch: (id: number) => void;
  watchedIds: Set<number>;
}) {
  const [collapsed, setCollapsed] = useState(group.filings.length > 3);
  const shown = collapsed ? group.filings.slice(0, 2) : group.filings;
  const total = group.buys + group.sells;
  const buyPct = total > 0 ? Math.round((group.buys / total) * 100) : 0;

  return (
    <div className="bg-surface-container-high/30 rounded-sm overflow-hidden border border-outline-variant/5">
      {/* Group header */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-container/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-surface-container-lowest flex items-center justify-center text-[10px] font-bold text-primary border border-outline-variant/20">
            {group.ticker}
          </div>
          <div>
            <span className="font-bold text-on-surface text-sm">
              {group.companyName}
            </span>
            <span className="text-xs text-on-surface-variant ml-2">
              {group.filings.length} filing
              {group.filings.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Mini buy/sell ratio */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span className="text-[10px] text-tertiary font-bold tnum">
                {group.buys}
              </span>
            </div>
            <div className="w-12 h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="bg-tertiary rounded-full"
                style={{ width: `${buyPct}%` }}
              />
              <div
                className="bg-error rounded-full"
                style={{ width: `${100 - buyPct}%` }}
              />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="text-[10px] text-error font-bold tnum">
                {group.sells}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filing rows */}
      <div className="divide-y divide-outline-variant/5">
        {shown.map((f) => (
          <FilingCard
            key={f.filing_id}
            filing={f}
            variant="feed"
            onWatch={onWatch}
            onUnwatch={onUnwatch}
            watchedIds={watchedIds}
          />
        ))}
      </div>

      {/* Show more/less */}
      {group.filings.length > 2 && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-2 text-xs text-primary font-bold hover:bg-surface-container/30 transition-colors flex items-center justify-center gap-1"
        >
          <span
            className={`material-symbols-outlined text-sm transition-transform duration-200 ${!collapsed ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
          {collapsed
            ? `Show ${group.filings.length - 2} more filing${group.filings.length - 2 > 1 ? "s" : ""}`
            : "Show less"}
        </button>
      )}
    </div>
  );
}

/* ── Pagination helpers ── */

function PaginationBtn({
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

/**
 * Build a compact page-number window:
 * always show first, last, current ±1, with "…" ellipsis gaps.
 */
function buildPageWindow(current: number, total: number): (number | "…")[] {
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

function fmtShortDate(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

/* ── Stats computation ── */

function computeStats(filings: Filing[]) {
  let buys = 0;
  let sells = 0;
  let totalBuyValue = 0;
  let totalSellValue = 0;
  const companyMap = new Map<
    number,
    { ticker: string; name: string; count: number }
  >();

  for (const f of filings) {
    const existing = companyMap.get(f.company_id);
    if (existing) {
      existing.count++;
    } else {
      companyMap.set(f.company_id, {
        ticker: f.ticker,
        name: f.company_name,
        count: 1,
      });
    }

    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) {
        buys++;
        totalBuyValue += t.totalValue || 0;
      } else {
        sells++;
        totalSellValue += t.totalValue || 0;
      }
    }
  }

  const topCompanies = Array.from(companyMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { buys, sells, totalBuyValue, totalSellValue, topCompanies };
}

/* ── Activity timeline ── */

function computeActivityTimeline(filings: Filing[]) {
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

/* ── Filtering ── */

function applyFilters(filings: Filing[], filters: FilterState): Filing[] {
  const now = Date.now();
  const msPerDay = 86400000;
  const rangeDays: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  return filings.filter((f) => {
    // Time range filter
    if (filters.timeRange !== "all") {
      const days = rangeDays[filters.timeRange];
      if (days) {
        const filingTime = new Date(f.filing_date).getTime();
        if (now - filingTime > days * msPerDay) return false;
      }
    }

    const txns = f.transactions || [];
    if (txns.length === 0) return true;

    // Direction filter
    if (filters.direction !== "all") {
      const wantBuy = filters.direction === "buy";
      const hasMatch = txns.some(
        (t) => isBuy(t.transactionCode, t.acquiredDisposed) === wantBuy,
      );
      if (!hasMatch) return false;
    }

    // Min value filter
    if (filters.minValue > 0) {
      const maxTxnValue = Math.max(
        ...txns.map((t) => Math.abs(t.totalValue || 0)),
      );
      if (maxTxnValue < filters.minValue) return false;
    }

    return true;
  });
}

/* ── Grouping by company ── */

function groupByCompany(filings: Filing[]): CompanyGroupData[] {
  const map = new Map<number, CompanyGroupData>();

  for (const f of filings) {
    let group = map.get(f.company_id);
    if (!group) {
      group = {
        companyId: f.company_id,
        ticker: f.ticker,
        companyName: f.company_name,
        filings: [],
        buys: 0,
        sells: 0,
      };
      map.set(f.company_id, group);
    }
    group.filings.push(f);
    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) group.buys++;
      else group.sells++;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.filings.length - a.filings.length,
  );
}
