import { SummaryMetric } from "./types";

type SummaryCardsProps = {
  metrics: SummaryMetric[];
  loading?: boolean;
};

export function SummaryCards({ metrics, loading = false }: SummaryCardsProps) {
  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-snap-border bg-snap-surface p-6"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-snap-bg" />
            <div className="mt-3 h-10 w-24 animate-pulse rounded bg-snap-bg" />
            <div className="mt-3 h-4 w-44 animate-pulse rounded bg-snap-bg" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-xl border border-snap-border bg-snap-surface p-6"
        >
          <p className="text-sm text-snap-textDim">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold text-snap-textMain">
            {metric.value}
          </p>
          {metric.helperText ? (
            <p className="mt-3 text-sm text-snap-textDim">{metric.helperText}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
