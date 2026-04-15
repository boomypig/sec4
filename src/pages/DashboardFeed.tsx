import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import FilingCard from "../components/FilingCard";
import { isBuy } from "../components/FilingCard";
import type { Filing } from "../components/FilingCard";
import InsightSummary from "../components/InsightSummary";
import FilterBar from "../components/FilterBar";
import type { FilterState } from "../components/FilterBar";
import { BuySellBar, ActivitySparkline } from "../components/Charts";
import HowItWorks from "../components/HowItWorks";

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

  useEffect(() => {
    fetch("/api/feed/recent")
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
    fetch("/api/watchlist", { credentials: "include" })
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
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId }),
    });
    if (res.ok) setWatchedIds((prev) => new Set(prev).add(companyId));
  }, []);

  const handleUnwatch = useCallback(async (companyId: number) => {
    const res = await fetch("/api/watchlist", {
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
        {filings.length > 0 && (
          <span className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-sm text-[10px] font-bold text-tertiary border border-tertiary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            {filings.length} FILINGS LOADED
          </span>
        )}
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
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  bolt
                </span>
                {filtered.length === filings.length
                  ? "All Insider Activity"
                  : `${filtered.length} of ${filings.length} filings`}
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

            {grouped.map((group) => (
              <CompanyGroup
                key={group.companyId}
                group={group}
                onWatch={handleWatch}
                onUnwatch={handleUnwatch}
                watchedIds={watchedIds}
              />
            ))}
          </section>

          {/* 5. How it works (for logged-out or new users) */}
          {!user && <HowItWorks isLoggedIn={false} />}
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
  const dayMap = new Map<string, { buys: number; sells: number }>();

  for (const f of filings) {
    const day = f.filing_date?.slice(0, 10);
    if (!day) continue;
    const entry = dayMap.get(day) || { buys: 0, sells: 0 };
    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) entry.buys++;
      else entry.sells++;
    }
    dayMap.set(day, entry);
  }

  return Array.from(dayMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
