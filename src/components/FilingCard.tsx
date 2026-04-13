import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Tooltip, { TOOLTIPS } from "./Tooltip";

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

/* ── Helpers (exported for use in pages) ── */

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

/** Build a human-readable sentence from a transaction */
export function transactionSentence(t: Transaction, _ticker?: string): string {
  const role = t.ownerTitle || "Insider";
  const name = t.ownerName || "Unknown";
  const buy = isBuy(t.transactionCode, t.acquiredDisposed);
  const action = buy ? "bought" : "sold";
  const sharesStr = t.shares != null ? `${fmtShares(t.shares)} shares` : "shares";
  const valueStr = t.totalValue != null ? ` worth ${fmtValue(t.totalValue)}` : "";
  const sentiment = buy ? "(bullish)" : "(bearish)";

  return `${name} (${role}) ${action} ${sharesStr}${valueStr} ${sentiment}`;
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
   Feed variant — readable sentence style
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
      <div className="flex items-start gap-4 px-5 py-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-sm">
        {/* Sentiment indicator */}
        <div
          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${buy ? "bg-tertiary" : "bg-error"}`}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Company header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-on-surface text-sm">
              {filing.ticker}
            </span>
            <span className="text-xs text-on-surface-variant">
              {filing.company_name}
            </span>
            <Tooltip content={TOOLTIPS.form4}>
              <span className="text-[10px] bg-surface-container-lowest px-1.5 py-0.5 rounded-sm font-bold text-on-surface-variant cursor-help border border-outline-variant/10">
                {filing.form_type}
              </span>
            </Tooltip>
            <span className="text-[10px] text-on-surface-variant/60 ml-auto tnum flex-shrink-0">
              {fmtDate(filing.filing_date)}
            </span>
          </div>

          {/* Readable sentence */}
          {t && (
            <p className="text-sm text-on-surface leading-relaxed">
              <span className="text-on-surface-variant">{t.ownerName}</span>
              {t.ownerTitle && (
                <span className="text-on-surface-variant/60">
                  {" "}({t.ownerTitle})
                </span>
              )}
              {" "}
              <span className={`font-bold ${buy ? "text-tertiary" : "text-error"}`}>
                {buy ? "bought" : "sold"}
              </span>
              {" "}
              {t.shares != null && (
                <Tooltip content={TOOLTIPS.shares}>
                  <span className="font-semibold text-on-surface tnum cursor-help underline decoration-dotted decoration-outline-variant/30 underline-offset-2">
                    {fmtShares(t.shares)} shares
                  </span>
                </Tooltip>
              )}
              {t.totalValue != null && (
                <>
                  {" worth "}
                  <Tooltip content={TOOLTIPS.value}>
                    <span
                      className={`font-bold tnum cursor-help underline decoration-dotted decoration-outline-variant/30 underline-offset-2 ${buy ? "text-tertiary" : "text-error"}`}
                    >
                      {fmtValue(t.totalValue)}
                    </span>
                  </Tooltip>
                </>
              )}
              {" "}
              <span
                className={`text-xs font-medium ${buy ? "text-tertiary/70" : "text-error/70"}`}
              >
                {buy ? "(bullish)" : "(bearish)"}
              </span>
            </p>
          )}

          {/* Multi-transaction expand */}
          {multi && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-primary font-bold hover:underline"
            >
              <span
                className={`material-symbols-outlined text-sm transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
              {expanded
                ? "Show less"
                : `+${txns.length - 1} more transaction${txns.length > 2 ? "s" : ""}`}
            </button>
          )}

          {/* Expanded: all transactions as sentences */}
          {expanded && multi && (
            <div className="mt-3 pl-2 border-l-2 border-outline-variant/20 space-y-2">
              {txns.slice(1).map((tx, i) => {
                const b = isBuy(tx.transactionCode, tx.acquiredDisposed);
                return (
                  <p key={i} className="text-xs text-on-surface-variant leading-relaxed">
                    <span className="text-on-surface">{tx.ownerName}</span>
                    {tx.ownerTitle && ` (${tx.ownerTitle})`}
                    {" "}
                    <span className={`font-bold ${b ? "text-tertiary" : "text-error"}`}>
                      {b ? "bought" : "sold"}
                    </span>
                    {" "}
                    {tx.shares != null && (
                      <span className="tnum">{fmtShares(tx.shares)} shares</span>
                    )}
                    {tx.totalValue != null && (
                      <span className={`font-bold tnum ${b ? "text-tertiary" : "text-error"}`}>
                        {" "}worth {fmtValue(tx.totalValue)}
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* Watch/Unwatch button */}
        <div className="flex items-center flex-shrink-0 mt-0.5">
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
    </div>
  );
}

/* ══════════════════════════════════════════════
   Watchlist Activity Card — sentence-based
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
          <Tooltip content={TOOLTIPS.form4}>
            <span className="text-[10px] bg-surface-container-lowest px-1.5 py-0.5 rounded-sm font-bold text-on-surface-variant cursor-help">
              {filing.form_type}
            </span>
          </Tooltip>
        </div>
        <span className="text-xs text-on-surface-variant tnum">
          {fmtDate(filing.filing_date)}
        </span>
      </div>

      {/* Company name */}
      <h4 className="font-bold text-on-surface mb-2 leading-snug text-sm">
        {filing.company_name}
      </h4>

      {/* Readable sentence */}
      {t && (
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {t.ownerName}
          {t.ownerTitle ? ` (${t.ownerTitle})` : ""}
          {" "}
          <span className={`font-bold ${buy ? "text-tertiary" : "text-error"}`}>
            {buy ? "bought" : "sold"}
          </span>
          {t.shares != null && (
            <span className="tnum"> {fmtShares(t.shares)} shares</span>
          )}
          {t.totalValue != null && (
            <span className={`font-bold tnum ${buy ? "text-tertiary" : "text-error"}`}>
              {" "}worth {fmtValue(t.totalValue)}
            </span>
          )}
          {" "}
          <span className={`text-xs ${buy ? "text-tertiary/60" : "text-error/60"}`}>
            {buy ? "(bullish)" : "(bearish)"}
          </span>
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
          {expanded ? "Show less" : `+${txns.length - 1} more`}
        </button>
      )}

      {/* Expanded sentences */}
      {expanded && multi && (
        <div className="mt-3 pl-3 border-l-2 border-outline-variant/20 space-y-2">
          {txns.slice(1).map((tx, i) => {
            const b = isBuy(tx.transactionCode, tx.acquiredDisposed);
            return (
              <p key={i} className="text-xs text-on-surface-variant leading-relaxed">
                {tx.ownerName}
                {tx.ownerTitle && ` (${tx.ownerTitle})`}
                {" "}
                <span className={`font-bold ${b ? "text-tertiary" : "text-error"}`}>
                  {b ? "bought" : "sold"}
                </span>
                {tx.shares != null && (
                  <span className="tnum"> {fmtShares(tx.shares)} shares</span>
                )}
                {tx.totalValue != null && (
                  <span className={`font-bold tnum ${b ? "text-tertiary" : "text-error"}`}>
                    {" "}worth {fmtValue(tx.totalValue)}
                  </span>
                )}
              </p>
            );
          })}
        </div>
      )}

      {/* Footer */}
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
