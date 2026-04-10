import { useState, useEffect, useCallback } from "react";
import FilingCard from "../components/FilingCard";
import {
  isBuy,
  txnLabel,
  fmtShares,
  fmtPrice,
  fmtFullValue,
} from "../components/FilingCard";
import type { Filing, Transaction } from "../components/FilingCard";

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
    const res = await fetch("/watchlist", {
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
      const res = await fetch("/watchlist/ticker", {
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

  const watchedTickers = getUniqueTickers(filings);
  const txnRows = flattenTransactions(filings);
  const stats = computeWatchlistStats(filings);

  return (
    <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          Institutional Watchlist
        </h1>

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
            placeholder="Enter ticker to track (e.g. MSFT, PLTR)..."
          />
          <button
            type="submit"
            disabled={adding}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">{adding ? "hourglass_top" : "add_circle"}</span>
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Transaction History Table */}
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-4">
              Watchlist Transaction History
            </h2>

            {loading && (
              <div className="text-center py-12 text-on-surface-variant">
                Loading...
              </div>
            )}
            {error && (
              <div className="text-center py-12 text-error">{error}</div>
            )}

            {!loading && !error && txnRows.length === 0 && (
              <div className="bg-surface-container-high rounded-sm p-12 text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block text-outline/30">
                  playlist_add
                </span>
                <p className="text-on-surface-variant text-sm">
                  No transactions yet. Add tickers above to start tracking.
                </p>
              </div>
            )}

            {txnRows.length > 0 && (
              <div className="bg-surface-container-high rounded-sm overflow-hidden border border-outline-variant/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/10">
                        <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Asset
                        </th>
                        <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Action
                        </th>
                        <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Shares
                        </th>
                        <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Price
                        </th>
                        <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Total Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {txnRows.slice(0, 10).map((row, i) => {
                        const buy = isBuy(row.txn.transactionCode, row.txn.acquiredDisposed);
                        return (
                          <tr
                            key={i}
                            className="border-b border-outline-variant/5 last:border-none hover:bg-surface-container/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-sm bg-surface-container-lowest flex items-center justify-center text-[9px] font-bold text-primary border border-outline-variant/20">
                                  {row.ticker}
                                </div>
                                <div>
                                  <p className="font-bold text-on-surface text-sm">
                                    {row.companyName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-sm font-bold ${
                                  buy
                                    ? "bg-tertiary/15 text-tertiary"
                                    : "bg-error/15 text-error"
                                }`}
                              >
                                {txnLabel(row.txn.transactionCode, row.txn.acquiredDisposed)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right tnum text-on-surface font-medium">
                              {fmtShares(row.txn.shares)}
                            </td>
                            <td className="py-3 px-4 text-right tnum text-on-surface font-medium">
                              {fmtPrice(row.txn.pricePerShare)}
                            </td>
                            <td
                              className={`py-3 px-4 text-right tnum font-bold ${
                                buy ? "text-tertiary" : "text-error"
                              }`}
                            >
                              {fmtFullValue(row.txn.totalValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Activity Feed */}
          {filings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">
                  Watchlist Activity Feed
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filings.map((f) => (
                  <FilingCard
                    key={f.filing_id}
                    filing={f}
                    variant="watchlist"
                    onUnwatch={handleRemove}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: 4 cols */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Watchlist Analytics */}
          <div className="bg-surface-container rounded-sm p-5 space-y-5">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">
              Watchlist Analytics
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase">
                  Tracked Entities
                </p>
                <p className="text-2xl font-black tracking-tighter text-on-surface tnum">
                  {watchedTickers.length}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase">
                  Total Filings
                </p>
                <p className="text-2xl font-black tracking-tighter text-on-surface tnum">
                  {filings.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase">
                  Buy Txns
                </p>
                <p className="text-2xl font-black tracking-tighter text-tertiary tnum">
                  {stats.buys}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-sm">
                <p className="text-[10px] text-on-surface-variant uppercase">
                  Sell Txns
                </p>
                <p className="text-2xl font-black tracking-tighter text-error tnum">
                  {stats.sells}
                </p>
              </div>
            </div>
          </div>

          {/* Feed status */}
          <div className="bg-surface-container-high rounded-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Feed Connected
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
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

type TxnRow = {
  ticker: string;
  companyName: string;
  txn: Transaction;
};

function flattenTransactions(filings: Filing[]): TxnRow[] {
  const rows: TxnRow[] = [];
  for (const f of filings) {
    for (const t of f.transactions || []) {
      rows.push({ ticker: f.ticker, companyName: f.company_name, txn: t });
    }
  }
  return rows;
}

function computeWatchlistStats(filings: Filing[]) {
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
