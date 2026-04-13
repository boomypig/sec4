type FilterState = {
  direction: "all" | "buy" | "sell";
  minValue: number;
  timeRange: "7d" | "30d" | "90d" | "all";
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

export type { FilterState };

export default function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-surface-container rounded-sm px-4 py-3">
      {/* Direction toggle */}
      <div className="flex items-center bg-surface-container-high rounded-sm overflow-hidden border border-outline-variant/10">
        {(["all", "buy", "sell"] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => onChange({ ...filters, direction: dir })}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              filters.direction === dir
                ? dir === "buy"
                  ? "bg-tertiary/20 text-tertiary"
                  : dir === "sell"
                    ? "bg-error/20 text-error"
                    : "bg-primary/20 text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      {/* Min value */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
          Min Value
        </span>
        <select
          value={filters.minValue}
          onChange={(e) =>
            onChange({ ...filters, minValue: Number(e.target.value) })
          }
          className="bg-surface-container-high text-on-surface text-xs px-2 py-1.5 rounded-sm border border-outline-variant/10 focus:ring-1 focus:ring-primary/30 outline-none"
        >
          <option value={0}>Any</option>
          <option value={10000}>$10K+</option>
          <option value={50000}>$50K+</option>
          <option value={100000}>$100K+</option>
          <option value={500000}>$500K+</option>
          <option value={1000000}>$1M+</option>
        </select>
      </div>

      {/* Time range */}
      <div className="flex items-center bg-surface-container-high rounded-sm overflow-hidden border border-outline-variant/10">
        {(["7d", "30d", "90d", "all"] as const).map((range) => (
          <button
            key={range}
            onClick={() => onChange({ ...filters, timeRange: range })}
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              filters.timeRange === range
                ? "bg-primary/20 text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {range === "all" ? "All" : range}
          </button>
        ))}
      </div>
    </div>
  );
}
