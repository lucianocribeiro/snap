"use client";

export type FilterConfig = {
  key: string;
  label: string;
  options?: { label: string; value: string }[];
  value: string;
  type?: "select" | "date";
};

type FilterBarProps = {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
};

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="rounded-xl border border-snap-border bg-snap-surface p-6">
      <div className="flex flex-wrap items-center gap-4">
        {filters.map((filter) => (
          <label key={filter.key} className="flex items-center gap-3 text-sm text-snap-textDim">
            <span>{filter.label}</span>
            {filter.type === "date" ? (
              <input
                type="date"
                value={filter.value}
                onChange={(event) => onChange(filter.key, event.target.value)}
                className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
            ) : (
              <select
                value={filter.value}
                onChange={(event) => onChange(filter.key, event.target.value)}
                className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              >
                {(filter.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
