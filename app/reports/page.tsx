"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { ProjectColumn } from "@/components/dashboard/types";
import { DEFAULT_SELECTED_COLUMNS, PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createClient } from "@/lib/supabase/client";

type ProjectOption = {
  id: string;
  name: string;
  period_type: string | null;
  created_at: string | null;
  selected_columns: ProjectColumn[] | null;
  custom_column_labels: { custom1?: string; custom2?: string; custom3?: string } | null;
};

type ProjectPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type InvoiceRow = {
  id: string;
  period_id: string | null;
  category_id: string | null;
  invoice_number: string | null;
  vendor: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  tax: number | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null;
  notes: string | null;
  custom1: string | null;
  custom2: string | null;
  custom3: string | null;
};

type StatusFilter = "all" | "paid" | "unpaid";

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatAmount(value: number | null, currency: string | null) {
  if (typeof value !== "number") return "-";
  const numeric = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${numeric} ${(currency ?? "USD").toUpperCase()}`;
}

function getLocalIsoDate() {
  const date = new Date();
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function sanitizeFileNamePart(value: string) {
  return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function generateMonthlyPeriods(createdAt: string): ProjectPeriod[] {
  const periods: ProjectPeriod[] = [];
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return periods;
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(1);
  end.setHours(0, 0, 0, 0);

  while (start <= end) {
    const monthStart = new Date(start);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    periods.push({
      id: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
      name: monthStart.toLocaleString("default", { month: "long", year: "numeric" }),
      startDate: toIsoDate(monthStart),
      endDate: toIsoDate(monthEnd),
    });
    start.setMonth(start.getMonth() + 1);
  }

  return periods;
}

function generateWeeklyPeriods(createdAt: string): ProjectPeriod[] {
  const periods: ProjectPeriod[] = [];
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return periods;

  let cursor = startOfWeekMonday(created);
  const currentWeekStart = startOfWeekMonday(new Date());

  while (cursor <= currentWeekStart) {
    const weekStart = new Date(cursor);
    const weekEnd = addDays(weekStart, 6);
    periods.push({
      id: toIsoDate(weekStart),
      name: `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
      startDate: toIsoDate(weekStart),
      endDate: toIsoDate(weekEnd),
    });
    cursor = addDays(cursor, 7);
  }

  return periods;
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useLanguage();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [periods, setPeriods] = useState<ProjectPeriod[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [selectedColumns, setSelectedColumns] = useState<ProjectColumn[]>([]);
  const [customLabels, setCustomLabels] = useState<{ custom1: string; custom2: string; custom3: string }>({
    custom1: "Custom 1",
    custom2: "Custom 2",
    custom3: "Custom 3",
  });

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      const { data } = await supabase
        .from("projects")
        .select("id, name, period_type, created_at, selected_columns, custom_column_labels")
        .order("name", { ascending: true });

      setProjects((data as ProjectOption[] | null) ?? []);
      setLoadingProjects(false);
    };

    void loadProjects();
  }, [supabase]);

  useEffect(() => {
    const loadProjectFilters = async () => {
      if (!selectedProjectId) {
        setPeriods([]);
        setCategories([]);
        setSelectedPeriodIds([]);
        setSelectedCategoryIds([]);
        setSelectedColumns([]);
        setInvoices([]);
        return;
      }

      const configuredColumns = selectedProject?.selected_columns?.length
        ? selectedProject.selected_columns
        : DEFAULT_SELECTED_COLUMNS;

      setSelectedColumns(configuredColumns);
      setCustomLabels({
        custom1: selectedProject?.custom_column_labels?.custom1 ?? "Custom 1",
        custom2: selectedProject?.custom_column_labels?.custom2 ?? "Custom 2",
        custom3: selectedProject?.custom_column_labels?.custom3 ?? "Custom 3",
      });
      setSelectedPeriodIds([]);
      setSelectedCategoryIds([]);

      const projectPeriodType = (selectedProject?.period_type ?? "").toLowerCase();
      const { data: categoryRows } = await supabase
        .from("categories")
        .select("id, name")
        .eq("project_id", selectedProjectId)
        .order("name");

      if (projectPeriodType === "custom") {
        const { data: periodRows } = await supabase
          .from("project_periods")
          .select("id, name, start_date, end_date")
          .eq("project_id", selectedProjectId)
          .order("start_date");

        setPeriods(
          ((periodRows as Array<{ id: string; name: string; start_date: string; end_date: string }> | null) ?? []).map(
            (period) => ({
              id: period.id,
              name: period.name,
              startDate: period.start_date,
              endDate: period.end_date,
            }),
          ),
        );
      } else if (projectPeriodType === "monthly") {
        let startDateValue = selectedProject?.created_at ?? null;
        const { data: earliest } = await supabase
          .from("invoices")
          .select("invoice_date")
          .eq("project_id", selectedProjectId)
          .not("invoice_date", "is", null)
          .order("invoice_date", { ascending: true })
          .limit(1)
          .single();

        const earliestInvoiceDate = (earliest as { invoice_date: string } | null)?.invoice_date ?? null;
        if (earliestInvoiceDate && selectedProject?.created_at) {
          const startDate = new Date(
            Math.min(new Date(earliestInvoiceDate).getTime(), new Date(selectedProject.created_at).getTime()),
          );
          startDateValue = toIsoDate(startDate);
        } else if (earliestInvoiceDate) {
          startDateValue = earliestInvoiceDate;
        }

        setPeriods(startDateValue ? generateMonthlyPeriods(startDateValue) : []);
      } else if (projectPeriodType === "weekly") {
        let startDateValue = selectedProject?.created_at ?? null;
        const { data: earliest } = await supabase
          .from("invoices")
          .select("invoice_date")
          .eq("project_id", selectedProjectId)
          .not("invoice_date", "is", null)
          .order("invoice_date", { ascending: true })
          .limit(1)
          .single();

        const earliestInvoiceDate = (earliest as { invoice_date: string } | null)?.invoice_date ?? null;
        if (earliestInvoiceDate && selectedProject?.created_at) {
          const startDate = new Date(
            Math.min(new Date(earliestInvoiceDate).getTime(), new Date(selectedProject.created_at).getTime()),
          );
          startDateValue = toIsoDate(startDate);
        } else if (earliestInvoiceDate) {
          startDateValue = earliestInvoiceDate;
        }

        setPeriods(startDateValue ? generateWeeklyPeriods(startDateValue) : []);
      } else {
        setPeriods([]);
      }

      setCategories((categoryRows as CategoryOption[] | null) ?? []);
    };

    void loadProjectFilters();
  }, [selectedProject, selectedProjectId, supabase]);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!selectedProjectId) {
        setInvoices([]);
        return;
      }

      setLoadingPreview(true);

      const selectedPeriods = selectedPeriodIds.filter(Boolean);
      const selectedCategories = selectedCategoryIds.filter(Boolean);
      const projectPeriodType = (selectedProject?.period_type ?? "").toLowerCase();
      const periodRangeById = new Map(periods.map((period) => [period.id, period]));
      console.log("[Reports] invoices query params", {
        projectId: selectedProjectId,
        periodType: projectPeriodType,
        selectedPeriods,
        selectedCategories,
        selectedStatus,
      });

      let query = supabase.from("invoices").select("*").eq("project_id", selectedProjectId);

      if (projectPeriodType === "custom" && selectedPeriods.length > 0) {
        query = query.in("period_id", selectedPeriods);
      }

      if (selectedCategories.length > 0) {
        query = query.in("category_id", selectedCategories);
      }

      if (selectedStatus === "paid" || selectedStatus === "unpaid") {
        query = query.eq("status", selectedStatus);
      }

      query = query.order("uploaded_at", { ascending: false });

      const { data, error } = await query;
      const queriedRows = (data as InvoiceRow[] | null) ?? [];
      const rows =
        (projectPeriodType === "monthly" || projectPeriodType === "weekly") && selectedPeriods.length > 0
          ? queriedRows.filter((invoice) => {
              if (!invoice.invoice_date) return false;
              const invoiceDate = new Date(invoice.invoice_date);
              if (Number.isNaN(invoiceDate.getTime())) return false;

              return selectedPeriods.some((periodId) => {
                const period = periodRangeById.get(periodId);
                if (!period) return false;
                const start = new Date(period.startDate);
                const end = new Date(period.endDate);
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
                return invoiceDate >= start && invoiceDate <= end;
              });
            })
          : queriedRows;

      console.log("[Reports] invoices query result", {
        selectedProjectId,
        invoiceCount: rows.length,
        error,
      });
      setInvoices(rows);
      setLoadingPreview(false);
    };

    void loadInvoices();
  }, [periods, selectedCategoryIds, selectedPeriodIds, selectedProject, selectedProjectId, selectedStatus, supabase]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "projectId",
      label: t("common.project"),
      value: selectedProjectId,
      options: [
        { label: t("reports.selectProject"), value: "" },
        ...projects.map((project) => ({ label: project.name, value: project.id })),
      ],
    },
    {
      key: "status",
      label: t("common.status"),
      value: selectedStatus,
      options: [
        { label: t("projects.statusAll"), value: "all" },
        { label: t("status.paid"), value: "paid" },
        { label: t("status.unpaid"), value: "unpaid" },
      ],
    },
  ];

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const resolveColumnLabel = (column: ProjectColumn) => {
    if (column === "custom1" || column === "custom2" || column === "custom3") {
      return customLabels[column];
    }
    return PROJECT_COLUMN_LABELS[column];
  };

  const toggleColumn = (column: ProjectColumn) => {
    setSelectedColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((item) => item !== column);
      }
      return [...prev, column];
    });
  };

  const previewColumns = selectedColumns;

  const getPreviewCell = (invoice: InvoiceRow, column: ProjectColumn) => {
    switch (column) {
      case "invoiceNumber":
        return invoice.invoice_number ?? "-";
      case "vendor":
        return invoice.vendor ?? "-";
      case "invoiceDate":
        return formatDate(invoice.invoice_date);
      case "dueDate":
        return formatDate(invoice.due_date);
      case "amount":
        return formatAmount(invoice.amount, invoice.currency);
      case "tax":
        return formatAmount(invoice.tax, invoice.currency);
      case "totalAmount":
        return formatAmount(invoice.total_amount, invoice.currency);
      case "category":
        return invoice.category_id ? categoryNameById.get(invoice.category_id) ?? "-" : "-";
      case "status":
        return invoice.status === "paid" ? t("status.paid") : t("status.unpaid");
      case "notes":
        return invoice.notes ?? "-";
      case "custom1":
        return invoice.custom1 ?? "-";
      case "custom2":
        return invoice.custom2 ?? "-";
      case "custom3":
        return invoice.custom3 ?? "-";
      default:
        return "-";
    }
  };

  const exportToExcel = () => {
    if (!selectedProject || previewColumns.length === 0 || invoices.length === 0) return;

    const includeCurrency = previewColumns.includes("amount") || previewColumns.includes("totalAmount");

    const rows = invoices.map((invoice) => {
      const row: Record<string, string | number | null> = {};

      for (const column of previewColumns) {
        const label = resolveColumnLabel(column);
        switch (column) {
          case "invoiceNumber":
            row[label] = invoice.invoice_number ?? "";
            break;
          case "vendor":
            row[label] = invoice.vendor ?? "";
            break;
          case "invoiceDate":
            row[label] = invoice.invoice_date ?? "";
            break;
          case "dueDate":
            row[label] = invoice.due_date ?? "";
            break;
          case "amount":
            row[label] = invoice.amount ?? null;
            break;
          case "tax":
            row[label] = invoice.tax ?? null;
            break;
          case "totalAmount":
            row[label] = invoice.total_amount ?? null;
            break;
          case "category":
            row[label] = invoice.category_id ? categoryNameById.get(invoice.category_id) ?? "" : "";
            break;
          case "status":
            row[label] = invoice.status === "paid" ? t("status.paid") : t("status.unpaid");
            break;
          case "notes":
            row[label] = invoice.notes ?? "";
            break;
          case "custom1":
            row[label] = invoice.custom1 ?? "";
            break;
          case "custom2":
            row[label] = invoice.custom2 ?? "";
            break;
          case "custom3":
            row[label] = invoice.custom3 ?? "";
            break;
          default:
            row[label] = "";
        }
      }

      if (includeCurrency) {
        row[t("invoices.currency")] = (invoice.currency ?? "USD").toUpperCase();
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("invoices.title"));

    const fileName = `Snap_${sanitizeFileNamePart(selectedProject.name)}_Report_${getLocalIsoDate()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <DashboardLayout pageTitle={t("reports.title")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title={t("reports.title")} description={t("reports.description")} />

        <FilterBar
          filters={filterConfigs}
          onChange={(key, value) => {
            if (key === "projectId") {
              setSelectedProjectId(value);
              return;
            }

            if (key === "status") {
              setSelectedStatus(value as StatusFilter);
            }
          }}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          {!selectedProjectId || periods.length > 0 ? (
            <article className="rounded-xl border border-snap-border bg-snap-surface p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-snap-textDim">{t("reports.periodSelector")}</h2>
              <p className="mt-1 text-sm text-snap-textDim">{t("reports.selectPeriodsDescription")}</p>
              <select
                multiple
                disabled={!selectedProjectId}
                value={selectedPeriodIds}
                onChange={(event) =>
                  setSelectedPeriodIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
                }
                className="mt-3 min-h-[160px] w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none disabled:opacity-60"
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </article>
          ) : null}

          <article className="rounded-xl border border-snap-border bg-snap-surface p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-snap-textDim">{t("reports.categoryFilter")}</h2>
            <p className="mt-1 text-sm text-snap-textDim">{t("reports.optionalMultiSelectFilter")}</p>
            <select
              multiple
              disabled={!selectedProjectId}
              value={selectedCategoryIds}
              onChange={(event) =>
                setSelectedCategoryIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
              }
              className="mt-3 min-h-[160px] w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none disabled:opacity-60"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </article>
        </section>

        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-snap-textDim">{t("reports.columnSelector")}</h2>
          <p className="mt-1 text-sm text-snap-textDim">
            {t("reports.columnSelectorDescription")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(PROJECT_COLUMN_LABELS) as ProjectColumn[]).map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column)}
                  onChange={() => toggleColumn(column)}
                  disabled={!selectedProjectId}
                  className="h-4 w-4 rounded border border-snap-border bg-snap-surface"
                />
                <span>{resolveColumnLabel(column)}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between rounded-xl border border-snap-border bg-snap-surface px-4 py-3">
          <p className="text-sm text-snap-textDim">
            {selectedProjectId
              ? t("reports.previewingInvoices", { count: invoices.length })
              : t("reports.selectProjectToStart")}
          </p>
          <button
            type="button"
            onClick={exportToExcel}
            disabled={!selectedProjectId || invoices.length === 0 || selectedColumns.length === 0}
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.exportToExcel")}
          </button>
        </div>

        {!selectedProjectId ? (
          <EmptyState
            title={t("reports.selectProjectPreviewTitle")}
            description={t("reports.selectProjectPreviewDescription")}
          />
        ) : loadingProjects || loadingPreview ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("reports.loadingPreview")}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title={t("reports.noInvoicesFound")}
            description={t("reports.noInvoicesForFilters")}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-snap-border bg-snap-surface">
            <table className="min-w-full divide-y divide-snap-border">
              <thead className="bg-snap-bg/80">
                <tr>
                  {previewColumns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-snap-textDim"
                    >
                      {resolveColumnLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-snap-border">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    {previewColumns.map((column) => (
                      <td key={`${invoice.id}-${column}`} className="px-4 py-3 text-sm text-snap-textMain">
                        {getPreviewCell(invoice, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
