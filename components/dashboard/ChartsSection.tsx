"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type ProjectOption = { id: string; name: string };

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
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-snap-textDim">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
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
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [projectPeriodSpend, setProjectPeriodSpend] = useState<Array<{ label: string; value: number }> | null>(null);
  const [projectCategorySpend, setProjectCategorySpend] = useState<Array<{ label: string; value: number }> | null>(null);
  const [projectChartsLoading, setProjectChartsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      setProjects((data as ProjectOption[] | null) ?? []);
    };
    void load();
  }, [supabase]);

  useEffect(() => {
    if (selectedProjectId === "all" || projectId) {
      setProjectPeriodSpend(null);
      setProjectCategorySpend(null);
      return;
    }

    const fetchProjectCharts = async () => {
      setProjectChartsLoading(true);
      const now = new Date();
      const sixMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      function dateStr(d: Date) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }

      const [{ data: monthlyRows }, { data: catRows }, { data: catDefs }] = await Promise.all([
        supabase
          .from("invoices")
          .select("invoice_date, total_amount")
          .eq("project_id", selectedProjectId)
          .gte("invoice_date", dateStr(sixMonthStart))
          .lt("invoice_date", dateStr(nextMonthStart)),
        supabase
          .from("invoices")
          .select("category_id, total_amount")
          .eq("project_id", selectedProjectId),
        supabase.from("categories").select("id, name").eq("project_id", selectedProjectId),
      ]);

      const monthKeys: string[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthStart.getFullYear(), sixMonthStart.getMonth() + i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }

      const spendByMonth = new Map(monthKeys.map((k) => [k, 0]));
      (monthlyRows ?? []).forEach((row: { invoice_date: string | null; total_amount: number | null }) => {
        if (!row.invoice_date) return;
        const d = new Date(row.invoice_date);
        if (Number.isNaN(d.getTime())) return;
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (spendByMonth.has(k)) spendByMonth.set(k, (spendByMonth.get(k) ?? 0) + (row.total_amount ?? 0));
      });

      const periodData = monthKeys.map((k) => {
        const [yr, mo] = k.split("-");
        return {
          label: new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString(undefined, { month: "short" }),
          value: spendByMonth.get(k) ?? 0,
        };
      });

      const catNameById = new Map(
        (catDefs ?? []).map((c: { id: string; name: string }) => [c.id, c.name]),
      );
      const catTotals = new Map<string, number>();
      (catRows ?? []).forEach((row: { category_id: string | null; total_amount: number | null }) => {
        const label = row.category_id
          ? catNameById.get(row.category_id) ?? t("dashboard.charts.uncategorized")
          : t("dashboard.charts.uncategorized");
        catTotals.set(label, (catTotals.get(label) ?? 0) + (row.total_amount ?? 0));
      });

      const sorted = Array.from(catTotals.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      const top6 = sorted.slice(0, 6);
      const otherVal = sorted.slice(6).reduce((sum, x) => sum + x.value, 0);
      const catData = otherVal > 0 ? [...top6, { label: t("dashboard.charts.other"), value: otherVal }] : top6;

      setProjectPeriodSpend(periodData);
      setProjectCategorySpend(catData);
      setProjectChartsLoading(false);
    };

    void fetchProjectCharts();
  }, [selectedProjectId, projectId, supabase, t]);

  const displayPeriodSpend = projectPeriodSpend ?? spendByPeriod;
  const displayCategorySpend = projectCategorySpend ?? spendByCategory;
  const isLoading = loading || projectChartsLoading;
  const displayHasInvoices =
    projectPeriodSpend !== null
      ? projectPeriodSpend.some((p) => p.value > 0) || (projectCategorySpend ?? []).some((c) => c.value > 0)
      : hasInvoices;

  const projectOptions = [
    { value: "all", label: t("dashboard.charts.allProjects") },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const periodOptions = [
    { value: t("dashboard.charts.monthly"), label: t("dashboard.charts.monthly") },
    { value: t("dashboard.charts.weekly"), label: t("dashboard.charts.weekly") },
    { value: t("dashboard.charts.quarterly"), label: t("dashboard.charts.quarterly") },
    { value: t("dashboard.charts.yearly"), label: t("dashboard.charts.yearly") },
  ];

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
              {!projectId ? (
                <FilterSelect
                  label={t("dashboard.charts.projectFilter")}
                  options={projectOptions}
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                />
              ) : null}
              <FilterSelect
                label={t("dashboard.charts.periodFilter")}
                options={periodOptions}
              />
            </>
          }
          content={
            isLoading ? (
              <ChartSkeleton />
            ) : !displayHasInvoices ? (
              <EmptyState
                title={t("dashboard.charts.noInvoicesTitle")}
                description={t("dashboard.charts.noInvoicesTrendDescription")}
              />
            ) : (
              <SpendByPeriodChart points={displayPeriodSpend} />
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
            !projectId ? (
              <FilterSelect
                label={t("dashboard.charts.projectFilter")}
                options={projectOptions}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
              />
            ) : null
          }
          content={
            isLoading ? (
              <ChartSkeleton />
            ) : !displayHasInvoices ? (
              <EmptyState
                title={t("dashboard.charts.noInvoicesTitle")}
                description={t("dashboard.charts.noInvoicesCategoryDescription")}
              />
            ) : (
              <SpendByCategoryChart
                points={displayCategorySpend}
                emptyLabel={t("dashboard.charts.noCategorizedSpend")}
              />
            )
          }
        />
      </div>
    </section>
  );
}
