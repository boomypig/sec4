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

/**
 * Why a Form 4 can arrive with zero reportable rows in our table:
 *  1. The filing only contains derivative transactions (options, RSUs)
 *     — we currently only ingest the non-derivative table.
 *  2. The filing is a holdings-only report (no actual trade that period).
 *  3. An amendment that corrects metadata without adding new rows.
 * Any of those is legitimate data, not a bug.
 */
function emptyTransactionExplanation(formType: string): string {
  if (formType?.toUpperCase().includes("4/A")) {
    return "This is an amended Form 4 with no new non-derivative rows — typically a correction to earlier filing metadata.";
  }
  return "No reportable non-derivative transactions on this filing. The insider either reported a holdings-only update or the filing only contains derivative activity (options / RSUs).";
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
  const [showInfo, setShowInfo] = useState(false);
  const txns = filing.transactions || [];
  const t = txns[0];
  const hasTxns = txns.length > 0;
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;
  const isWatched = watchedIds?.has(filing.company_id);
  const multi = txns.length > 1;

  return (
    <div className="group">
      <div className="flex items-start gap-4 px-5 py-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-sm">
        {/* Sentiment indicator */}
        <div
          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${hasTxns ? (buy ? "bg-tertiary" : "bg-error") : "bg-outline"}`}
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

          {/* Empty-transactions explanation */}
          {!hasTxns && (
            <div className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
              <span className="material-symbols-outlined text-sm text-outline/60 mt-px">
                info
              </span>
              <p>{emptyTransactionExplanation(filing.form_type)}</p>
            </div>
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

          {/* Collapsible: more filing info */}
          {showInfo && <FilingInfoPanel filing={filing} />}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <MoreInfoButton open={showInfo} onToggle={() => setShowInfo((s) => !s)} />
          {user ? (
            isWatched ? (
              <button
                onClick={() => onUnwatch?.(filing.company_id)}
                className="text-on-surface-variant/40 hover:text-error transition-colors p-1"
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
                className="text-on-surface-variant/40 hover:text-primary transition-colors p-1"
                title="Add to watchlist"
              >
                <span className="material-symbols-outlined text-lg">
                  bookmark_border
                </span>
              </button>
            )
          ) : (
            <div className="relative group/tip p-1">
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

/* ── More info toggle button ── */

function MoreInfoButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? "Hide filing details" : "Show filing details"}
      className={`p-1 transition-colors ${
        open
          ? "text-primary"
          : "text-on-surface-variant/40 hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-lg">
        {open ? "unfold_less" : "info"}
      </span>
    </button>
  );
}

/* ── Filing info panel (accession #, dates, etc.) ── */

function FilingInfoPanel({ filing }: { filing: Filing }) {
  const txns = filing.transactions || [];
  const [copied, setCopied] = useState(false);

  async function copyAccession() {
    try {
      await navigator.clipboard.writeText(filing.accession_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  // EDGAR full-text search is the most reliable public URL for an accession.
  const edgarUrl = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(
    filing.accession_no,
  )}%22&forms=4`;

  return (
    <div className="mt-3 rounded-sm bg-surface-container-lowest border border-outline-variant/10 p-3 space-y-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-on-surface-variant uppercase tracking-wider text-[10px] font-bold">
          Filing Details
        </span>
        <a
          href={edgarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline font-bold"
        >
          View on EDGAR
          <span className="material-symbols-outlined text-xs">open_in_new</span>
        </a>
      </div>

      <InfoRow label="Accession #">
        <button
          type="button"
          onClick={copyAccession}
          className="font-mono text-on-surface hover:text-primary transition-colors flex items-center gap-1"
          title="Copy accession number"
        >
          {filing.accession_no}
          <span className="material-symbols-outlined text-xs">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </InfoRow>
      <InfoRow label="Form Type">
        <span className="font-bold text-on-surface">{filing.form_type}</span>
      </InfoRow>
      <InfoRow label="Filing Date">
        <span className="tnum text-on-surface">{fmtDate(filing.filing_date)}</span>
      </InfoRow>
      {filing.period_of_report && (
        <InfoRow label="Period of Report">
          <span className="tnum text-on-surface">
            {fmtDate(filing.period_of_report)}
          </span>
        </InfoRow>
      )}
      <InfoRow label="Company">
        <span className="text-on-surface">
          {filing.company_name}{" "}
          <span className="text-on-surface-variant">({filing.ticker})</span>
        </span>
      </InfoRow>
      <InfoRow label="Transactions">
        <span className="tnum text-on-surface">
          {txns.length}
          {txns.length === 0 && (
            <span className="text-on-surface-variant"> — see note above</span>
          )}
        </span>
      </InfoRow>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-on-surface-variant flex-shrink-0">{label}</span>
      <div className="text-right min-w-0 break-all">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Watchlist Activity Card — sentence-based
   ══════════════════════════════════════════════ */

function WatchlistActivityCard({ filing, onUnwatch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const txns = filing.transactions || [];
  const t = txns[0];
  const hasTxns = txns.length > 0;
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;
  const multi = txns.length > 1;

  return (
    <div className="bg-surface-container-high rounded-sm p-5 hover:ring-1 hover:ring-outline-variant/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${hasTxns ? (buy ? "bg-tertiary" : "bg-error") : "bg-outline"}`}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant tnum">
            {fmtDate(filing.filing_date)}
          </span>
          <MoreInfoButton open={showInfo} onToggle={() => setShowInfo((s) => !s)} />
        </div>
      </div>

      {/* Company name */}
      <h4 className="font-bold text-on-surface mb-2 leading-snug text-sm">
        {filing.company_name}
      </h4>

      {/* Empty-transactions explanation */}
      {!hasTxns && (
        <div className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
          <span className="material-symbols-outlined text-sm text-outline/60 mt-px">
            info
          </span>
          <p>{emptyTransactionExplanation(filing.form_type)}</p>
        </div>
      )}

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

      {/* Collapsible: more filing info */}
      {showInfo && <FilingInfoPanel filing={filing} />}

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
