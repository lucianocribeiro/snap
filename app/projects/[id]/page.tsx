"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import type { PeriodType, ProjectColumn } from "@/components/dashboard/types";
import { InvoicesTable, type InvoiceTableRow } from "@/components/invoices/InvoicesTable";
import { PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [project, setProject] = useState<ProjectDetailState | null>(null);
  const [invoices, setInvoices] = useState<InvoiceTableRow[]>([]);

  const canManage = userRole === "org_admin";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("created") === "1") setToast("Project created successfully.");
    if (search.get("updated") === "1") setToast("Project updated successfully.");
  }, []);

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
    { label: "Invoices", value: String(invoices.length), helperText: "Total project invoices" },
    {
      label: "Total Amount",
      value: new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
        invoices.reduce((sum, invoice) => sum + (invoice.totalAmount ?? 0), 0),
      ),
      helperText: "Current imported total",
    },
    { label: "Categories", value: String(project?.categories.length ?? 0), helperText: "Active categories" },
    {
      label: "Columns",
      value: String(project?.selectedColumns.length ?? 0),
      helperText: "Tracked fields",
    },
  ];

  const archiveProject = async () => {
    if (!project) return;
    await supabase.from("projects").update({ status: "archived" }).eq("id", project.id);
    setProject((prev) => (prev ? { ...prev, status: "Archived" } : prev));
    setArchiveOpen(false);
  };

  return (
    <DashboardLayout pageTitle="Project Detail">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        <PageHeader
          title={project?.name ?? "Project"}
          description={project?.description || "Project details and configuration"}
          action={
            canManage && project ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="rounded-md border border-snap-border px-3 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="rounded-md border border-snap-border px-3 py-2 text-sm text-amber-300 hover:bg-snap-bg"
                >
                  Archive
                </button>
              </div>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {([
            ["overview", "Overview"],
            ["invoices", "Invoices"],
            ["dashboard", "Dashboard"],
            ["reports", "Reports"],
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
            Loading project...
          </div>
        ) : null}

        {!loading && !project ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Project not found.
          </div>
        ) : null}

        {!loading && project && activeTab === "overview" ? (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-snap-border bg-snap-surface p-5">
              <p className="text-xs uppercase tracking-wide text-snap-textDim">Status</p>
              <div className="mt-2">
                <StatusBadge status={project.status} variant="project" />
              </div>
              <p className="mt-4 text-sm text-snap-textDim">Period type: {project.periodType}</p>
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
              <p className="text-xs uppercase tracking-wide text-snap-textDim">Selected Columns</p>
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
              <p className="text-xs uppercase tracking-wide text-snap-textDim">Categories</p>
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
                + Add Invoice
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

        {!loading && project && activeTab === "reports" ? <ReportBuilder projectId={project.id} /> : null}
      </div>

      <ConfirmModal
        open={archiveOpen}
        title="Archive Project"
        description="This project will no longer appear as active."
        confirmLabel="Archive"
        destructive
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void archiveProject()}
      />
    </DashboardLayout>
  );
}
