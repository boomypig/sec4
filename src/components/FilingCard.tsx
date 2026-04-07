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

function isBuy(code: string | null, ad: string | null): boolean {
  return code === "P" || ad === "A";
}

function txnLabel(code: string | null, ad: string | null): string {
  if (code === "P" || ad === "A") return "BUY";
  if (code === "S" || ad === "D") return "SELL";
  if (code === "A") return "AWARD";
  if (code === "M") return "EXERCISE";
  return code?.toUpperCase() || "OTHER";
}

function fmtValue(val: number | null): string {
  if (val == null) return "\u2014";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShares(val: number | null): string {
  if (val == null) return "\u2014";
  return val.toLocaleString("en-US");
}

type Props = {
  filing: Filing;
  variant?: "feed" | "watchlist";
  onWatch?: (companyId: number) => void;
  onUnwatch?: (companyId: number) => void;
  watchedIds?: Set<number>;
};

export default function FilingCard({
  filing,
  variant = "feed",
  onWatch,
  onUnwatch,
  watchedIds,
}: Props) {
  if (variant === "watchlist") {
    return (
      <WatchlistFilingRow filing={filing} onUnwatch={onUnwatch} />
    );
  }
  return (
    <FeedCard
      filing={filing}
      onWatch={onWatch}
      onUnwatch={onUnwatch}
      watchedIds={watchedIds}
    />
  );
}

/* ── Feed variant: dashboard card ── */
function FeedCard({
  filing,
  onWatch,
  onUnwatch,
  watchedIds,
}: {
  filing: Filing;
  onWatch?: (id: number) => void;
  onUnwatch?: (id: number) => void;
  watchedIds?: Set<number>;
}) {
  const { user } = useAuth();
  const txns = filing.transactions || [];
  const t = txns[0];
  const isWatched = watchedIds?.has(filing.company_id);
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;

  return (
    <div className="bg-surface-container-high p-6 rounded-sm group hover:ring-1 hover:ring-primary/20 transition-all">
      {/* Top: Ticker + Watch */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tighter text-on-surface">
            ${filing.ticker}
          </span>
          {t && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${
                buy
                  ? "bg-tertiary/10 text-tertiary"
                  : "bg-error/10 text-error"
              }`}
            >
              {txnLabel(t.transactionCode, t.acquiredDisposed)}
            </span>
          )}
        </div>
        {/* Watch button */}
        {user ? (
          isWatched ? (
            <button
              onClick={() => onUnwatch?.(filing.company_id)}
              className="text-on-surface-variant/40 hover:text-error transition-colors"
              title="Remove from watchlist"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          ) : (
            <button
              onClick={() => onWatch?.(filing.company_id)}
              className="text-on-surface-variant/40 hover:text-primary transition-colors"
              title="Add to watchlist"
            >
              <span className="material-symbols-outlined text-sm">
                add_circle
              </span>
            </button>
          )
        ) : (
          <div className="relative group/tip">
            <span className="material-symbols-outlined text-outline-variant/40 text-sm cursor-help">
              star_outline
            </span>
            <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tip:block bg-surface-container-highest text-on-surface text-[10px] px-2 py-1 rounded-sm whitespace-nowrap shadow-lg border border-outline-variant/20">
              Log in to track
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-on-surface-variant">{filing.company_name}</p>

      {/* Transaction details */}
      {t && (
        <div className="mt-4 p-4 bg-surface-container-low/50 rounded-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/60">
                Insider
              </p>
              <p className="text-sm font-semibold text-on-surface">
                {t.ownerName}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/60">
                Action
              </p>
              <p
                className={`text-sm font-bold uppercase ${buy ? "text-tertiary" : "text-error"}`}
              >
                {txnLabel(t.transactionCode, t.acquiredDisposed)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/60">
                Shares
              </p>
              <p className="text-sm font-bold tnum text-on-surface">
                {fmtShares(t.shares)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/60">
                Value
              </p>
              <p className="text-sm font-bold tnum text-on-surface">
                {fmtValue(t.totalValue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
          <span className="bg-surface-container-highest text-[10px] px-1.5 py-0.5 rounded-sm font-black text-on-surface">
            {filing.form_type}
          </span>
          {txns.length > 1 && (
            <span>+{txns.length - 1} more txn{txns.length > 2 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Watchlist variant: dense filing row ── */
function WatchlistFilingRow({
  filing,
  onUnwatch,
}: {
  filing: Filing;
  onUnwatch?: (id: number) => void;
}) {
  const txns = filing.transactions || [];
  const t = txns[0];
  const buy = t ? isBuy(t.transactionCode, t.acquiredDisposed) : false;

  return (
    <div className="p-6 hover:bg-surface-container transition-colors flex gap-6">
      {/* Left: ticker badge */}
      <div className="flex-shrink-0 w-12 text-center">
        <div className="w-12 h-12 rounded-sm bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-primary border border-outline-variant/20">
          {filing.ticker}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-sm font-black ${
              buy
                ? "bg-surface-container-highest text-on-surface"
                : "bg-error/10 text-error"
            }`}
          >
            {filing.form_type}
          </span>
          <span className="text-xs font-bold text-on-surface">
            ${filing.ticker}
          </span>
        </div>
        <h4 className="font-bold text-lg text-on-surface leading-snug">
          {filing.company_name}
        </h4>

        {/* Transaction detail */}
        {t && (
          <p className="text-sm text-on-surface-variant mt-1">
            {t.ownerName}
            {t.ownerTitle ? ` (${t.ownerTitle})` : ""}
            {" \u2014 "}
            <span className={buy ? "text-tertiary font-bold" : "text-error font-bold"}>
              {txnLabel(t.transactionCode, t.acquiredDisposed)}
            </span>
            {t.shares != null && ` ${fmtShares(t.shares)} shares`}
            {t.totalValue != null && `, ${fmtValue(t.totalValue)}`}
          </p>
        )}

        {txns.length > 1 && (
          <p className="text-xs text-on-surface-variant/50 mt-1">
            +{txns.length - 1} more transaction{txns.length > 2 ? "s" : ""}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => onUnwatch?.(filing.company_id)}
            className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Unwatch {filing.ticker}
          </button>
        </div>
      </div>
    </div>
  );
}
