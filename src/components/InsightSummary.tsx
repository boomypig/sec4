import Tooltip, { TOOLTIPS } from "./Tooltip";

type Props = {
  buys: number;
  sells: number;
  totalBuyValue: number;
  totalSellValue: number;
  topCompanies: { ticker: string; name: string; count: number }[];
  filingCount: number;
};

export default function InsightSummary({
  buys,
  sells,
  totalBuyValue,
  totalSellValue,
  topCompanies,
  filingCount,
}: Props) {
  const total = buys + sells;
  const buyPct = total > 0 ? Math.round((buys / total) * 100) : 0;
  const isBullish = buys > sells;
  const isNeutral = buys === sells;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Buy Activity */}
      <div className="bg-surface-container rounded-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-lg">
            trending_up
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
            Buy Activity
          </span>
        </div>
        <p className="text-3xl font-black tracking-tighter text-tertiary tnum">
          {buys}
        </p>
        <p className="text-xs text-on-surface-variant">
          {fmtCompact(totalBuyValue)} total value
        </p>
      </div>

      {/* Sell Activity */}
      <div className="bg-surface-container rounded-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">
            trending_down
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
            Sell Activity
          </span>
        </div>
        <p className="text-3xl font-black tracking-tighter text-error tnum">
          {sells}
        </p>
        <p className="text-xs text-on-surface-variant">
          {fmtCompact(totalSellValue)} total value
        </p>
      </div>

      {/* Sentiment */}
      <div className="bg-surface-container rounded-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Tooltip content={isBullish ? TOOLTIPS.bullish : TOOLTIPS.bearish}>
            <span
              className={`material-symbols-outlined text-lg ${isBullish ? "text-tertiary" : isNeutral ? "text-on-surface-variant" : "text-error"}`}
            >
              {isBullish ? "sentiment_satisfied" : isNeutral ? "sentiment_neutral" : "sentiment_dissatisfied"}
            </span>
          </Tooltip>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
            Sentiment
          </span>
        </div>
        <p
          className={`text-2xl font-black tracking-tighter ${isBullish ? "text-tertiary" : isNeutral ? "text-on-surface-variant" : "text-error"}`}
        >
          {isNeutral ? "Neutral" : isBullish ? "Bullish" : "Bearish"}
        </p>
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-on-surface-variant">
              <span>{buyPct}% buying</span>
              <span>{100 - buyPct}% selling</span>
            </div>
            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
              <div
                className="bg-tertiary rounded-full transition-all duration-500"
                style={{ width: `${buyPct}%` }}
              />
              <div
                className="bg-error rounded-full transition-all duration-500"
                style={{ width: `${100 - buyPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Most Active */}
      <div className="bg-surface-container rounded-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">
            workspace_premium
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
            Most Active
          </span>
        </div>
        {topCompanies.length > 0 ? (
          <div className="space-y-2">
            {topCompanies.slice(0, 3).map(({ ticker, count }, i) => (
              <div key={ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant font-bold w-3">
                    {i + 1}.
                  </span>
                  <span className="text-sm font-bold text-on-surface">
                    {ticker}
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant tnum">
                  {count} filing{count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No data yet</p>
        )}
        <p className="text-[10px] text-on-surface-variant pt-1">
          {filingCount} total filings
        </p>
      </div>
    </div>
  );
}

function fmtCompact(val: number): string {
  if (val === 0) return "$0";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}
