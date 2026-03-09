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
  const { userRole } = useAuth();
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
            "id, project_id, category_id, invoice_number, vendor, invoice_date, due_date, amount, tax, total_amount, status",
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
      label: "Project",
      value: filters.projectId,
      options: [{ label: "All Projects", value: "all" }, ...projects.map((project) => ({ label: project.name, value: project.id }))],
    },
    {
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { label: "All", value: "all" },
        { label: "Paid", value: "paid" },
        { label: "Unpaid", value: "unpaid" },
      ],
    },
    {
      key: "categoryId",
      label: "Category",
      value: filters.categoryId,
      options: [
        { label: "All Categories", value: "all" },
        ...categories.map((category) => ({ label: category.name, value: category.id })),
      ],
    },
    { key: "dateFrom", label: "Date From", value: filters.dateFrom, type: "date" },
    { key: "dateTo", label: "Date To", value: filters.dateTo, type: "date" },
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
    <DashboardLayout pageTitle="Invoices">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Invoices"
          action={
            <button
              type="button"
              onClick={() => router.push("/invoices/new")}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
            >
              + Add Invoice
            </button>
          }
        />

        <FilterBar
          filters={filterConfigs}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value } as FiltersState))}
        />

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Loading invoices...
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
        title="Delete Invoice"
        description="This action cannot be undone."
        confirmLabel="Delete Invoice"
        destructive
        onCancel={() => setInvoiceToDelete(null)}
        onConfirm={() => void deleteInvoice()}
      />
    </DashboardLayout>
  );
}
