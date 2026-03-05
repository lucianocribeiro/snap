import { SummaryMetric } from "./types";

type SummaryCardsProps = {
  metrics: SummaryMetric[];
};

export function SummaryCards({ metrics }: SummaryCardsProps) {
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
