import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export type Transaction = {
  ownerName: string;
  ownerTitle: string;
  transactionCode: string;
  shares: number | null;
  pricePerShare: number | null;
  totalValue: number | null;
  transactionDate: string | null;
  acquiredDisposed: string | null;
  securityTitle: string | null;
};

export type Filing = {
  filing_id: number;
  accession_no: string;
  form_type: string;
  filing_date: string;
  period_of_report: string | null;
  company_id: number;
  ticker: string;
  company_name: string;
  transactions: Transaction[] | null;
};

/* ── Helpers ── */

export function isBuy(code: string | null, ad: string | null): boolean {
  return code === "P" || ad === "A";
}

export function txnLabel(code: string | null, ad: string | null): string {
  if (code === "P" || ad === "A") return "BUY";
  if (code === "S" || ad === "D") return "SELL";
  if (code === "A") return "AWARD";
  if (code === "M") return "EXERCISE";
  if (code === "G") return "GIFT";
  return code?.toUpperCase() || "OTHER";
}

export function fmtValue(val: number | null): string {
  if (val == null) return "\u2014";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtFullValue(val: number | null): string {
  if (val == null) return "\u2014";
  return (
    "$" +
    val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtShares(val: number | null): string {
  if (val == null) return "\u2014";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPrice(val: number | null): string {
  if (val == null) return "\u2014";
  return (
    "$" +
    val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/* ── Props ── */

type Props = {
  filing: Filing;
  variant?: "feed" | "watchlist";
  onWatch?: (companyId: number) => void;
  onUnwatch?: (companyId: number) => void;
  watchedIds?: Set<number>;
};

export default function FilingCard(props: Props) {
  if (props.variant === "watchlist")
    return <WatchlistActivityCard {...props} />;
  return <FeedCard {...props} />;
}

/* ══════════════════════════════════════════════
   Feed variant — dashboard table-row style
   ══════════════════════════════════════════════ */

function FeedCard({ filing, onWatch, onUnwatch, watchedIds }: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const txns = filing.transactions || [];
  const t = txns[0];
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;
  const isWatched = watchedIds?.has(filing.company_id);
  const multi = txns.length > 1;

  return (
    <div className="group">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-sm">
        {/* Ticker badge */}
        <div className="w-10 h-10 flex-shrink-0 bg-surface-container-lowest rounded-sm flex items-center justify-center text-[10px] font-bold text-primary border border-outline-variant/20">
          {filing.ticker}
        </div>

        {/* Company + insider */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface text-sm">
              {filing.company_name}
            </span>
            <span className="text-[10px] bg-surface-container-lowest px-1.5 py-0.5 rounded-sm font-black text-on-surface-variant">
              {filing.form_type}
            </span>
          </div>
          {t && (
            <p className="text-xs text-on-surface-variant truncate">
              {t.ownerName}
              {t.ownerTitle ? ` \u2022 ${t.ownerTitle}` : ""}
            </p>
          )}
        </div>

        {/* Action */}
        {t && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-sm font-bold flex-shrink-0 ${
              buy ? "bg-tertiary/15 text-tertiary" : "bg-error/15 text-error"
            }`}
          >
            {txnLabel(t.transactionCode, t.acquiredDisposed)}
          </span>
        )}

        {/* Shares */}
        <div className="hidden md:block text-right flex-shrink-0 w-24">
          <p className="text-xs text-on-surface-variant">Shares</p>
          <p className="text-sm font-bold tnum text-on-surface">
            {t ? fmtShares(t.shares) : "\u2014"}
          </p>
        </div>

        {/* Value */}
        <div className="hidden md:block text-right flex-shrink-0 w-28">
          <p className="text-xs text-on-surface-variant">Value</p>
          <p
            className={`text-sm font-bold tnum ${buy ? "text-tertiary" : "text-error"}`}
          >
            {t ? fmtValue(t.totalValue) : "\u2014"}
          </p>
        </div>

        {/* Date */}
        <div className="hidden lg:block text-right flex-shrink-0 w-28">
          <p className="text-xs text-on-surface-variant">Filed</p>
          <p className="text-xs font-medium tnum text-on-surface">
            {fmtDate(filing.filing_date)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Expand toggle */}
          {multi && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              title={expanded ? "Collapse" : `${txns.length} transactions`}
            >
              <span
                className={`material-symbols-outlined text-lg transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
            </button>
          )}

          {/* Watch / Unwatch */}
          {user ? (
            isWatched ? (
              <button
                onClick={() => onUnwatch?.(filing.company_id)}
                className="text-on-surface-variant/40 hover:text-error transition-colors"
                title="Remove from watchlist"
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bookmark
                </span>
              </button>
            ) : (
              <button
                onClick={() => onWatch?.(filing.company_id)}
                className="text-on-surface-variant/40 hover:text-primary transition-colors"
                title="Add to watchlist"
              >
                <span className="material-symbols-outlined text-lg">
                  bookmark_border
                </span>
              </button>
            )
          ) : (
            <div className="relative group/tip">
              <span className="material-symbols-outlined text-outline-variant/40 text-lg cursor-help">
                bookmark_border
              </span>
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tip:block bg-surface-container-highest text-on-surface text-[10px] px-2 py-1 rounded-sm whitespace-nowrap shadow-lg border border-outline-variant/20 z-10">
                Log in to track
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded transaction table */}
      {expanded && multi && (
        <div className="mx-5 mb-4 bg-surface-container rounded-sm border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant/10 text-on-surface-variant">
                <th className="text-left py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Insider
                </th>
                <th className="text-left py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Action
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Shares
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Price
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Total Value
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {txns.map((tx, i) => {
                const b = isBuy(tx.transactionCode, tx.acquiredDisposed);
                return (
                  <tr
                    key={i}
                    className="border-b border-outline-variant/5 last:border-none hover:bg-surface-container-high/50"
                  >
                    <td className="py-2.5 px-3 text-on-surface font-medium">
                      {tx.ownerName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${b ? "bg-tertiary/15 text-tertiary" : "bg-error/15 text-error"}`}
                      >
                        {txnLabel(tx.transactionCode, tx.acquiredDisposed)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tnum text-on-surface">
                      {fmtShares(tx.shares)}
                    </td>
                    <td className="py-2.5 px-3 text-right tnum text-on-surface">
                      {fmtPrice(tx.pricePerShare)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tnum font-bold ${b ? "text-tertiary" : "text-error"}`}
                    >
                      {fmtFullValue(tx.totalValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right tnum text-on-surface-variant">
                      {fmtDate(tx.transactionDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Watchlist Activity Card — filing event card
   ══════════════════════════════════════════════ */

function WatchlistActivityCard({ filing, onUnwatch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const txns = filing.transactions || [];
  const t = txns[0];
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;
  const multi = txns.length > 1;

  return (
    <div className="bg-surface-container-high rounded-sm p-5 hover:ring-1 hover:ring-outline-variant/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${buy ? "bg-tertiary" : "bg-error"}`}
          />
          <span className="text-sm font-bold text-on-surface">
            {filing.ticker}
          </span>
          <span className="text-[10px] bg-surface-container-lowest px-1.5 py-0.5 rounded-sm font-black text-on-surface-variant">
            {filing.form_type}
          </span>
        </div>
        <span className="text-xs text-on-surface-variant tnum">
          {fmtDate(filing.filing_date)}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-bold text-on-surface mb-1 leading-snug">
        {filing.company_name}
      </h4>

      {/* First transaction summary */}
      {t && (
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {t.ownerName}
          {t.ownerTitle ? ` (${t.ownerTitle})` : ""}
          {" \u2014 "}
          <span
            className={buy ? "text-tertiary font-bold" : "text-error font-bold"}
          >
            {txnLabel(t.transactionCode, t.acquiredDisposed)}
          </span>
          {t.shares != null && ` ${fmtShares(t.shares)} shares`}
          {t.totalValue != null && ` totaling ${fmtValue(t.totalValue)}`}
        </p>
      )}

      {/* Expand toggle for multi-transactions */}
      {multi && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-primary font-bold hover:underline"
        >
          <span
            className={`material-symbols-outlined text-sm transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
          {expanded ? "Collapse" : `View all ${txns.length} transactions`}
        </button>
      )}

      {/* Expanded transactions table */}
      {expanded && multi && (
        <div className="mt-3 bg-surface-container rounded-sm border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant/10 text-on-surface-variant">
                <th className="text-left py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Insider
                </th>
                <th className="text-left py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Action
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Shares
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Price
                </th>
                <th className="text-right py-2 px-3 font-bold uppercase text-[10px] tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {txns.map((tx, i) => {
                const b = isBuy(tx.transactionCode, tx.acquiredDisposed);
                return (
                  <tr
                    key={i}
                    className="border-b border-outline-variant/5 last:border-none"
                  >
                    <td className="py-2 px-3 text-on-surface font-medium">
                      {tx.ownerName}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${b ? "bg-tertiary/15 text-tertiary" : "bg-error/15 text-error"}`}
                      >
                        {txnLabel(tx.transactionCode, tx.acquiredDisposed)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tnum text-on-surface">
                      {fmtShares(tx.shares)}
                    </td>
                    <td className="py-2 px-3 text-right tnum text-on-surface">
                      {fmtPrice(tx.pricePerShare)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tnum font-bold ${b ? "text-tertiary" : "text-error"}`}
                    >
                      {fmtFullValue(tx.totalValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">description</span>
          SEC Filing
        </div>
        <button
          onClick={() => onUnwatch?.(filing.company_id)}
          className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-error transition-colors font-bold"
        >
          <span className="material-symbols-outlined text-sm">
            bookmark_remove
          </span>
          Unwatch
        </button>
      </div>
    </div>
  );
}
