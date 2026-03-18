"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import type { PeriodType, ProjectColumn } from "@/components/dashboard/types";
import { InvoicesTable, type InvoiceTableRow } from "@/components/invoices/InvoicesTable";
import { PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type TabKey = "overview" | "invoices" | "dashboard" | "reports";

type ProjectDetailState = {
  id: string;
  name: string;
  description: string;
  periodType: PeriodType;
  customPeriods: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  selectedColumns: ProjectColumn[];
  customLabels: { custom1?: string; custom2?: string; custom3?: string };
  categories: string[];
  status: "Active" | "Archived";
};

function mapStatus(value: string | null) {
  if (!value) return "Active";
  return value.toLowerCase() === "archived" || value.toLowerCase() === "inactive"
    ? "Archived"
    : "Active";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [project, setProject] = useState<ProjectDetailState | null>(null);
  const [invoices, setInvoices] = useState<InvoiceTableRow[]>([]);

  const canManage = userRole === "org_admin";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("created") === "1") setToast(t("projects.createdSuccess"));
    if (search.get("updated") === "1") setToast(t("projects.updatedSuccess"));
  }, [t]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const projectId = params.id;
      const [{ data: projectRow }, { data: periodRows }, { data: categoryRows }, { data: invoiceRows }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, name, description, period_type, selected_columns, custom_column_labels, status")
            .eq("id", projectId)
            .maybeSingle(),
          supabase
            .from("project_periods")
            .select("id, name, start_date, end_date")
            .eq("project_id", projectId)
            .order("start_date", { ascending: true }),
          supabase.from("categories").select("id, name").eq("project_id", projectId).order("name"),
          supabase
            .from("invoices")
            .select("id, invoice_number, vendor, invoice_date, due_date, amount, tax, total_amount, currency, status")
            .eq("project_id", projectId)
            .order("uploaded_at", { ascending: false }),
        ]);

      if (!projectRow) {
        setProject(null);
        setInvoices([]);
        setLoading(false);
        return;
      }

      setProject({
        id: projectRow.id,
        name: projectRow.name,
        description: projectRow.description ?? "",
        periodType: (projectRow.period_type as PeriodType) ?? "Monthly",
        customPeriods: (periodRows ?? []).map((period) => ({
          id: period.id,
          name: period.name,
          startDate: period.start_date,
          endDate: period.end_date,
        })),
        selectedColumns: (projectRow.selected_columns as ProjectColumn[]) ?? [],
        customLabels: (projectRow.custom_column_labels as { custom1?: string; custom2?: string; custom3?: string }) ?? {},
        categories: (categoryRows ?? []).map((category) => category.name),
        status: mapStatus(projectRow.status),
      });

      setInvoices(
        (invoiceRows ?? []).map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number ?? "",
          vendor: invoice.vendor ?? "",
          projectName: projectRow.name,
          categoryName: "",
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          amount: invoice.amount,
          tax: invoice.tax,
          totalAmount: invoice.total_amount,
          currency: invoice.currency?.toUpperCase() ?? "USD",
          status: invoice.status === "paid" ? "Paid" : "Unpaid",
        })),
      );
      setLoading(false);
    };

    void load();
  }, [params.id, supabase]);

  const projectMetrics = [
    { label: t("projects.invoices"), value: String(invoices.length), helperText: t("projects.totalProjectInvoices") },
    {
      label: t("invoices.total"),
      value: new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
        invoices.reduce((sum, invoice) => sum + (invoice.totalAmount ?? 0), 0),
      ),
      helperText: t("projects.currentImportedTotal"),
    },
    { label: t("categories.title"), value: String(project?.categories.length ?? 0), helperText: t("projects.activeCategories") },
    {
      label: t("projects.columns"),
      value: String(project?.selectedColumns.length ?? 0),
      helperText: t("projects.trackedFields"),
    },
  ];

  const archiveProject = async () => {
    if (!project) return;
    await supabase.from("projects").update({ status: "archived" }).eq("id", project.id);
    setProject((prev) => (prev ? { ...prev, status: "Archived" } : prev));
    setArchiveOpen(false);
  };

  return (
    <DashboardLayout pageTitle={t("projects.projectDetail")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        <PageHeader
          title={project?.name ?? t("common.project")}
          description={project?.description || t("projects.detailsAndConfiguration")}
          action={
            canManage && project ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="rounded-md border border-snap-border px-3 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
                >
                  {t("common.edit")}
                </Link>
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="rounded-md border border-snap-border px-3 py-2 text-sm text-amber-300 hover:bg-snap-bg"
                >
                  {t("projects.archive")}
                </button>
              </div>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {([
            ["overview", t("projects.overview")],
            ["invoices", t("nav.invoices")],
            ["dashboard", t("nav.dashboard")],
            ["reports", t("nav.reports")],
          ] as Array<[TabKey, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                "rounded-md border px-3 py-1.5 text-sm",
                activeTab === key
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-snap-border bg-snap-surface text-snap-textDim",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("projects.loadingProject")}
          </div>
        ) : null}

        {!loading && !project ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("projects.notFound")}
          </div>
        ) : null}

        {!loading && project && activeTab === "overview" ? (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-snap-border bg-snap-surface p-5">
              <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("common.status")}</p>
              <div className="mt-2">
                <StatusBadge status={project.status} variant="project" />
              </div>
              <p className="mt-4 text-sm text-snap-textDim">{t("projects.periodType")}: {project.periodType}</p>
              {project.periodType === "Custom" && project.customPeriods.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-snap-textDim">
                  {project.customPeriods.map((period) => (
                    <li key={period.id}>
                      {period.name}: {formatDate(period.startDate)} - {formatDate(period.endDate)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="rounded-lg border border-snap-border bg-snap-surface p-5">
              <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("projects.selectedColumns")}</p>
              <ul className="mt-2 space-y-1 text-sm text-snap-textMain">
                {project.selectedColumns.map((column) => (
                  <li key={column}>
                    {column === "custom1" || column === "custom2" || column === "custom3"
                      ? project.customLabels[column] || PROJECT_COLUMN_LABELS[column]
                      : PROJECT_COLUMN_LABELS[column]}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-snap-border bg-snap-surface p-5 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("categories.title")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-snap-border bg-snap-bg px-3 py-1 text-xs text-snap-textMain"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {!loading && project && activeTab === "invoices" ? (
          <section className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/invoices/new?projectId=${project.id}`}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain"
              >
                {t("invoices.addInvoiceWithPlus")}
              </Link>
            </div>
            <InvoicesTable invoices={invoices} showProjectColumn={false} />
          </section>
        ) : null}

        {!loading && project && activeTab === "dashboard" ? (
          <section className="space-y-6">
            <SummaryCards metrics={projectMetrics} />
            <ChartsSection projectId={project.id} />
          </section>
        ) : null}

        {!loading && project && activeTab === "reports" ? (
          <section className="flex items-center justify-center rounded-lg border border-snap-border bg-snap-surface p-12">
            <Link
              href={`/reports?project=${project.id}`}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
            >
              {t("nav.reports")}
            </Link>
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={archiveOpen}
        title={t("projects.archiveProjectTitle")}
        description={t("projects.archiveProjectDetailDescription")}
        confirmLabel={t("projects.archive")}
        destructive
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void archiveProject()}
      />
    </DashboardLayout>
  );
}
