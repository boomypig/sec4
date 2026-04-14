/* Pure SVG chart components — no external dependencies */

type BuySellBarProps = {
  buys: number;
  sells: number;
};

export function BuySellBar({ buys, sells }: BuySellBarProps) {
  const max = Math.max(buys, sells, 1);
  const buyH = (buys / max) * 80;
  const sellH = (sells / max) * 80;

  return (
    <div className="bg-surface-container rounded-sm p-5">
      <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant mb-4">
        Buy vs Sell Volume
      </h3>
      <svg viewBox="0 0 200 120" className="w-full h-32">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1="30"
            y1={100 - pct * 80}
            x2="180"
            y2={100 - pct * 80}
            stroke="#494454"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}

        {/* Buy bar */}
        <rect
          x="55"
          y={100 - buyH}
          width="40"
          height={buyH}
          rx="2"
          fill="#4edea3"
          opacity="0.85"
        />
        <text
          x="75"
          y={95 - buyH}
          textAnchor="middle"
          fill="#4edea3"
          fontSize="10"
          fontWeight="700"
        >
          {buys}
        </text>

        {/* Sell bar */}
        <rect
          x="115"
          y={100 - sellH}
          width="40"
          height={sellH}
          rx="2"
          fill="#ffb4ab"
          opacity="0.85"
        />
        <text
          x="135"
          y={95 - sellH}
          textAnchor="middle"
          fill="#ffb4ab"
          fontSize="10"
          fontWeight="700"
        >
          {sells}
        </text>

        {/* Labels */}
        <text
          x="75"
          y="115"
          textAnchor="middle"
          fill="#cbc3d7"
          fontSize="9"
          fontWeight="600"
        >
          Buys
        </text>
        <text
          x="135"
          y="115"
          textAnchor="middle"
          fill="#cbc3d7"
          fontSize="9"
          fontWeight="600"
        >
          Sells
        </text>
      </svg>
    </div>
  );
}

type ActivityPoint = {
  date: string; // "YYYY-MM-DD"
  buys: number;
  sells: number;
};

type ActivitySparklineProps = {
  data: ActivityPoint[];
};

export function ActivitySparkline({ data }: ActivitySparklineProps) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-container rounded-sm p-5">
        <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant mb-4">
          Activity Over Time
        </h3>
        <p className="text-xs text-on-surface-variant text-center py-6">
          Not enough data yet
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.buys + d.sells), 1);
  const w = 280;
  const h = 100;
  const padding = { top: 10, right: 10, bottom: 25, left: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barW = Math.max(4, Math.min(16, chartW / data.length - 2));

  return (
    <div className="bg-surface-container rounded-sm p-5">
      <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant mb-4">
        Activity Over Time
      </h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
        {data.map((d, i) => {
          const x =
            padding.left + (i / Math.max(data.length - 1, 1)) * chartW - barW / 2;
          const totalH = ((d.buys + d.sells) / maxVal) * chartH;
          const buyH = (d.buys / maxVal) * chartH;
          const sellH = totalH - buyH;
          const baseY = padding.top + chartH;

          return (
            <g key={d.date}>
              {/* Buy portion (bottom) */}
              <rect
                x={Math.max(x, padding.left)}
                y={baseY - buyH}
                width={barW}
                height={Math.max(buyH, 0)}
                rx="1"
                fill="#4edea3"
                opacity="0.8"
              />
              {/* Sell portion (top) */}
              <rect
                x={Math.max(x, padding.left)}
                y={baseY - buyH - sellH}
                width={barW}
                height={Math.max(sellH, 0)}
                rx="1"
                fill="#ffb4ab"
                opacity="0.8"
              />
              {/* Date label (first, middle, last) */}
              {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
                <text
                  x={Math.max(x, padding.left) + barW / 2}
                  y={h - 2}
                  textAnchor="middle"
                  fill="#958ea0"
                  fontSize="7"
                >
                  {formatShortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-tertiary opacity-80" />
          <span className="text-[10px] text-on-surface-variant">Buys</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-error opacity-80" />
          <span className="text-[10px] text-on-surface-variant">Sells</span>
        </div>
      </div>
    </div>
  );
}

function formatShortDate(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}
