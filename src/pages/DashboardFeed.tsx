import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FilingCard from "../components/FilingCard";
import { isBuy } from "../components/FilingCard";
import type { Filing } from "../components/FilingCard";

export default function DashboardFeed() {
  const { user } = useAuth();

  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());

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
    fetch("/watchlist", { credentials: "include" })
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
    const res = await fetch("/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId }),
    });
    if (res.ok) setWatchedIds((prev) => new Set(prev).add(companyId));
  }, []);

  const handleUnwatch = useCallback(async (companyId: number) => {
    const res = await fetch("/watchlist", {
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

  // Computed stats from real data
  const stats = computeStats(filings);

  return (
    <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Market Discovery
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Real-time insider activity from SEC EDGAR Form 4 filings.
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

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main feed: 8 cols */}
        <div className="lg:col-span-8 space-y-1">
          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">
                bolt
              </span>
              Recent Insider Activity
            </h2>
          </div>

          {loading && (
            <div className="text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block text-outline/40 animate-pulse">
                hourglass_top
              </span>
              Loading filings...
            </div>
          )}
          {error && <div className="text-center py-20 text-error">{error}</div>}
          {!loading && !error && filings.length === 0 && (
            <div className="text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block text-outline/40">
                folder_off
              </span>
              No filings yet. The system is still syncing data from SEC EDGAR.
            </div>
          )}

          {/* Filing rows */}
          <div className="divide-y divide-outline-variant/5 bg-surface-container-high/30 rounded-sm overflow-hidden">
            {filings.map((f) => (
              <FilingCard
                key={f.filing_id}
                filing={f}
                variant="feed"
                onWatch={handleWatch}
                onUnwatch={handleUnwatch}
                watchedIds={watchedIds}
              />
            ))}
          </div>
        </div>

        {/* Sidebar: 4 cols */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Stats panel */}
          <div className="bg-surface-container rounded-sm p-5 space-y-5">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">
              Activity Summary
            </h3>

            {/* Buy / Sell row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                  Buy Txns
                </p>
                <p className="text-2xl font-black tracking-tighter text-tertiary tnum">
                  {stats.buys}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                  Sell Txns
                </p>
                <p className="text-2xl font-black tracking-tighter text-error tnum">
                  {stats.sells}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                  Entities
                </p>
                <p className="text-2xl font-black tracking-tighter text-on-surface tnum">
                  {stats.tickers.length}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                  Filings
                </p>
                <p className="text-2xl font-black tracking-tighter text-on-surface tnum">
                  {filings.length}
                </p>
              </div>
            </div>
          </div>

          {/* Top tickers */}
          {stats.tickers.length > 0 && (
            <div className="bg-surface-container rounded-sm p-5">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-4">
                Top Tickers
              </h3>
              <div className="space-y-3">
                {stats.tickers.slice(0, 6).map(({ ticker, count }) => (
                  <div
                    key={ticker}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-surface-container-highest flex items-center justify-center text-[9px] font-bold text-primary border border-outline-variant/20">
                        {ticker}
                      </div>
                      <span className="text-sm font-semibold text-on-surface">
                        {ticker}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant tnum">
                      {count} filing{count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logged-out CTA */}
          {!user && (
            <div className="bg-gradient-to-br from-primary-container to-surface-container-high p-5 rounded-sm relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-on-surface text-sm mb-1">
                  Unlock Watchlists
                </h3>
                <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                  Track specific companies and build your own SEC filing feed.
                </p>
                <Link
                  to="/login"
                  className="text-primary text-xs font-bold flex items-center gap-1 group hover:underline"
                >
                  Log in to track tickers
                  <span className="material-symbols-outlined text-xs transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

/* ── Compute real stats from filing data ── */
function computeStats(filings: Filing[]) {
  let buys = 0;
  let sells = 0;
  const tickerMap = new Map<string, number>();

  for (const f of filings) {
    tickerMap.set(f.ticker, (tickerMap.get(f.ticker) || 0) + 1);
    for (const t of f.transactions || []) {
      if (isBuy(t.transactionCode, t.acquiredDisposed)) buys++;
      else sells++;
    }
  }

  const tickers = Array.from(tickerMap.entries())
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count);

  return { buys, sells, tickers };
}
