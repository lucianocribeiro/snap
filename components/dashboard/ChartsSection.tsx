import { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function ChartCard({
  title,
  subtitle,
  filters,
  content,
}: {
  title: string;
  subtitle: string;
  filters: ReactNode;
  content: ReactNode;
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
        {content}
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

type ChartsSectionProps = {
  projectId?: string;
  loading?: boolean;
  hasInvoices?: boolean;
  spendByPeriod?: Array<{ label: string; value: number }>;
  spendByCategory?: Array<{ label: string; value: number }>;
};

const chartColors = [
  "bg-blue-400",
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-rose-400",
];

function ChartSkeleton() {
  return (
    <div className="flex w-full max-w-xl items-end justify-between gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex w-full flex-col items-center gap-2">
          <div className="h-32 w-full animate-pulse rounded-md bg-snap-bg" />
          <div className="h-3 w-10 animate-pulse rounded bg-snap-bg" />
        </div>
      ))}
    </div>
  );
}

function SpendByPeriodChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  return (
    <div className="w-full">
      <div className="flex h-52 items-end gap-4">
        {points.map((point) => {
          const height = maxValue > 0 ? Math.max(10, Math.round((point.value / maxValue) * 100)) : 10;
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs text-snap-textDim">{point.value.toLocaleString()}</div>
              <div className="relative flex h-40 w-full items-end rounded-md bg-snap-bg/70">
                <div
                  className="w-full rounded-md bg-blue-500/70"
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-xs text-snap-textDim">{point.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpendByCategoryChart({
  points,
  emptyLabel,
}: {
  points: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (total <= 0) {
    return <p className="text-sm text-snap-textDim">{emptyLabel}</p>;
  }

  return (
    <div className="w-full space-y-4">
      {points.map((point, index) => {
        const percentage = (point.value / total) * 100;
        return (
          <div key={point.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${chartColors[index % chartColors.length]}`} />
                <span className="text-snap-textMain">{point.label}</span>
              </div>
              <span className="text-snap-textDim">{percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded bg-snap-bg">
              <div
                className={`${chartColors[index % chartColors.length]} h-full rounded`}
                style={{ width: `${Math.max(percentage, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartsSection({
  projectId,
  loading = false,
  hasInvoices = false,
  spendByPeriod = [],
  spendByCategory = [],
}: ChartsSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-snap-border bg-snap-card p-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ChartCard
          title={t("dashboard.charts.spendByPeriod")}
          subtitle={
            projectId
              ? t("dashboard.charts.spendByPeriodSubtitleProject", { projectId })
              : t("dashboard.charts.spendByPeriodSubtitleAll")
          }
          filters={
            <>
              <FilterSelect
                label={t("dashboard.charts.projectFilter")}
                options={[t("dashboard.charts.allProjects")]}
              />
              <FilterSelect
                label={t("dashboard.charts.periodFilter")}
                options={[
                  t("dashboard.charts.monthly"),
                  t("dashboard.charts.weekly"),
                  t("dashboard.charts.quarterly"),
                  t("dashboard.charts.yearly"),
                ]}
              />
            </>
          }
          content={
            loading ? (
              <ChartSkeleton />
            ) : !hasInvoices ? (
              <EmptyState
                title={t("dashboard.charts.noInvoicesTitle")}
                description={t("dashboard.charts.noInvoicesTrendDescription")}
              />
            ) : (
              <SpendByPeriodChart points={spendByPeriod} />
            )
          }
        />

        <ChartCard
          title={t("dashboard.charts.spendByCategory")}
          subtitle={
            projectId
              ? t("dashboard.charts.spendByCategorySubtitleProject")
              : t("dashboard.charts.spendByCategorySubtitleAll")
          }
          filters={
            <FilterSelect
              label={t("dashboard.charts.projectFilter")}
              options={[t("dashboard.charts.allProjects")]}
            />
          }
          content={
            loading ? (
              <ChartSkeleton />
            ) : !hasInvoices ? (
              <EmptyState
                title={t("dashboard.charts.noInvoicesTitle")}
                description={t("dashboard.charts.noInvoicesCategoryDescription")}
              />
            ) : (
              <SpendByCategoryChart
                points={spendByCategory}
                emptyLabel={t("dashboard.charts.noCategorizedSpend")}
              />
            )
          }
        />
      </div>
    </section>
  );
}
