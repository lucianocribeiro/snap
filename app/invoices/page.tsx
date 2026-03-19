"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InvoicesTable, type InvoiceTableRow } from "@/components/invoices/InvoicesTable";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { FilterBar, type FilterConfig } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type InvoiceRecord = {
  id: string;
  project_id: string;
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
};

type NamedEntity = {
  id: string;
  name: string;
};

type FiltersState = {
  projectId: string;
  status: "all" | "paid" | "unpaid";
  categoryId: string;
  dateFrom: string;
  dateTo: string;
};

export default function InvoicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { userRole, canEdit } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<NamedEntity[]>([]);
  const [categories, setCategories] = useState<NamedEntity[]>([]);
  const [invoices, setInvoices] = useState<InvoiceTableRow[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceTableRow | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    projectId: "all",
    status: "all",
    categoryId: "all",
    dateFrom: "",
    dateTo: "",
  });

  const canDelete = userRole === "org_admin";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: projectRows }, { data: categoryRows }, { data: invoiceRows }] = await Promise.all([
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("categories").select("id, name").order("name"),
        supabase
          .from("invoices")
          .select(
            "id, project_id, category_id, invoice_number, vendor, invoice_date, due_date, amount, tax, total_amount, currency, status",
          )
          .order("uploaded_at", { ascending: false }),
      ]);

      const projectMap = new Map((projectRows ?? []).map((row) => [row.id as string, row.name as string]));
      const categoryMap = new Map((categoryRows ?? []).map((row) => [row.id as string, row.name as string]));

      setProjects((projectRows as NamedEntity[] | null) ?? []);
      setCategories((categoryRows as NamedEntity[] | null) ?? []);
      setInvoices(
        ((invoiceRows as InvoiceRecord[] | null) ?? []).map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number ?? "",
          vendor: invoice.vendor ?? "",
          projectName: projectMap.get(invoice.project_id) ?? "-",
          categoryName: invoice.category_id ? categoryMap.get(invoice.category_id) ?? "-" : "-",
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
  }, [supabase]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "projectId",
      label: t("common.project"),
      value: filters.projectId,
      options: [{ label: t("dashboard.charts.allProjects"), value: "all" }, ...projects.map((project) => ({ label: project.name, value: project.id }))],
    },
    {
      key: "status",
      label: t("common.status"),
      value: filters.status,
      options: [
        { label: t("projects.statusAll"), value: "all" },
        { label: t("status.paid"), value: "paid" },
        { label: t("status.unpaid"), value: "unpaid" },
      ],
    },
    {
      key: "categoryId",
      label: t("categories.title"),
      value: filters.categoryId,
      options: [
        { label: t("categories.allCategories"), value: "all" },
        ...categories.map((category) => ({ label: category.name, value: category.id })),
      ],
    },
    { key: "dateFrom", label: t("common.dateFrom"), value: filters.dateFrom, type: "date" },
    { key: "dateTo", label: t("common.dateTo"), value: filters.dateTo, type: "date" },
  ];

  const filteredInvoices = invoices.filter((invoice) => {
    if (filters.projectId !== "all") {
      const selectedProject = projects.find((project) => project.id === filters.projectId);
      if (!selectedProject || invoice.projectName !== selectedProject.name) return false;
    }

    if (filters.status !== "all") {
      if (invoice.status.toLowerCase() !== filters.status) return false;
    }

    if (filters.categoryId !== "all") {
      const selectedCategory = categories.find((category) => category.id === filters.categoryId);
      if (!selectedCategory || invoice.categoryName !== selectedCategory.name) return false;
    }

    if (filters.dateFrom && invoice.invoiceDate && invoice.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && invoice.invoiceDate && invoice.invoiceDate > filters.dateTo) return false;

    return true;
  });

  const deleteInvoice = async () => {
    if (!invoiceToDelete) return;
    await supabase.from("invoices").delete().eq("id", invoiceToDelete.id);
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceToDelete.id));
    setInvoiceToDelete(null);
  };

  return (
    <DashboardLayout pageTitle={t("invoices.title")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title={t("invoices.title")}
          action={
            canEdit ? (
              <button
                type="button"
                onClick={() => router.push("/invoices/new")}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
              >
                {t("invoices.addInvoiceWithPlus")}
              </button>
            ) : null
          }
        />

        <FilterBar
          filters={filterConfigs}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value } as FiltersState))}
        />

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("invoices.loadingInvoices")}
          </div>
        ) : (
          <InvoicesTable
            invoices={filteredInvoices}
            canManage={canDelete}
            onDelete={setInvoiceToDelete}
          />
        )}
      </div>

      <ConfirmModal
        open={Boolean(invoiceToDelete)}
        title={t("invoices.deleteInvoiceTitle")}
        description={t("common.cannotBeUndone")}
        confirmLabel={t("invoices.deleteInvoiceTitle")}
        destructive
        onCancel={() => setInvoiceToDelete(null)}
        onConfirm={() => void deleteInvoice()}
      />
    </DashboardLayout>
  );
}
