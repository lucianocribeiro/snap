import { ReactNode } from "react";

function ChartCard({
  title,
  subtitle,
  filters,
  hint,
}: {
  title: string;
  subtitle: string;
  filters: ReactNode;
  hint: string;
}) {
  return (
    <article className="flex min-h-[320px] flex-col gap-6 rounded-xl border border-snap-border bg-snap-surface p-8">
      <header className="flex flex-col gap-4 border-b border-snap-border pb-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-snap-textMain">{title}</h2>
          <p className="text-sm text-snap-textDim">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">{filters}</div>
      </header>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-snap-border bg-snap-bg/50 p-8">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-sm font-medium text-snap-textMain">Chart placeholder</p>
          <p className="text-sm text-snap-textDim">{hint}</p>
        </div>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-snap-textDim">
      <span>{label}</span>
      <select className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function ChartsSection() {
  return (
    <section className="rounded-2xl border border-snap-border bg-snap-card p-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ChartCard
          title="Total Spend by Period"
          subtitle="Analyze spending trends over time and compare by project."
          filters={
            <>
              <FilterSelect
                label="Project"
                options={["All projects", "Acme Redesign", "ERP Migration", "Ops Hub"]}
              />
              <FilterSelect
                label="Period"
                options={["Monthly", "Weekly", "Quarterly", "Yearly"]}
              />
            </>
          }
          hint="Bar chart visualization will render once invoice data is available."
        />

        <ChartCard
          title="Spend by Category"
          subtitle="Track allocation by vendor category and expense type."
          filters={
            <FilterSelect
              label="Project"
              options={["All projects", "Acme Redesign", "ERP Migration", "Ops Hub"]}
            />
          }
          hint="Pie or donut breakdown appears after categorization is configured."
        />
      </div>
    </section>
  );
}
