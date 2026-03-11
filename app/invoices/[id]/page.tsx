"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProjectColumn } from "@/components/dashboard/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type CategoryOption = { id: string; name: string };
type CurrencyCode = "USD" | "ARS" | "EUR" | "GBP" | "BRL" | "UYU";

const CURRENCY_OPTIONS: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "ARS", label: "ARS - Argentine Peso" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BRL", label: "BRL - Brazilian Real" },
  { value: "UYU", label: "UYU - Uruguayan Peso" },
];

type EditableInvoice = {
  id: string;
  projectId: string;
  invoiceNumber: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  tax: string;
  totalAmount: string;
  currency: CurrencyCode;
  categoryId: string;
  status: "paid" | "unpaid";
  notes: string;
  custom1: string;
  custom2: string;
  custom3: string;
  originalFileUrl: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  lastEditedAt: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toText(value: number | string | null) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatAmountWithCurrency(value: string, currency: CurrencyCode) {
  if (!value) return `- ${currency}`;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value} ${currency}`;
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)} ${currency}`;
}

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  const normalized = (value ?? "").toUpperCase();
  const valid = new Set(CURRENCY_OPTIONS.map((option) => option.value));
  return valid.has(normalized as CurrencyCode) ? (normalized as CurrencyCode) : "USD";
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invoice, setInvoice] = useState<EditableInvoice | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ProjectColumn[]>([]);
  const [customLabels, setCustomLabels] = useState({ custom1: "Custom 1", custom2: "Custom 2", custom3: "Custom 3" });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploaderName, setUploaderName] = useState<string>("Unknown user");

  const canDelete = userRole === "org_admin";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("created") === "1") {
      setToast("Invoice saved successfully.");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: invoiceRow } = await supabase
        .from("invoices")
        .select(
          "id, project_id, invoice_number, vendor, invoice_date, due_date, amount, tax, total_amount, currency, category_id, status, notes, custom1, custom2, custom3, original_file_url, uploaded_at, uploaded_by, last_edited_at",
        )
        .eq("id", params.id)
        .maybeSingle();

      if (!invoiceRow) {
        setInvoice(null);
        setLoading(false);
        return;
      }

      const [{ data: projectRow }, { data: categoryRows }] = await Promise.all([
        supabase
          .from("projects")
          .select("selected_columns, custom_column_labels")
          .eq("id", invoiceRow.project_id)
          .maybeSingle(),
        supabase.from("categories").select("id, name").eq("project_id", invoiceRow.project_id).order("name"),
      ]);

      if (invoiceRow.uploaded_by) {
        const { data: uploaderRow } = await supabase
          .from("user_profiles")
          .select("first_name, last_name, email")
          .eq("id", invoiceRow.uploaded_by)
          .maybeSingle();

        if (uploaderRow) {
          const name = [uploaderRow.first_name, uploaderRow.last_name].filter(Boolean).join(" ");
          setUploaderName(name || uploaderRow.email || "Unknown user");
        }
      }

      setSelectedColumns((projectRow?.selected_columns as ProjectColumn[]) ?? []);
      setCustomLabels({
        custom1: projectRow?.custom_column_labels?.custom1 ?? "Custom 1",
        custom2: projectRow?.custom_column_labels?.custom2 ?? "Custom 2",
        custom3: projectRow?.custom_column_labels?.custom3 ?? "Custom 3",
      });
      setCategories((categoryRows as CategoryOption[] | null) ?? []);

      setInvoice({
        id: invoiceRow.id,
        projectId: invoiceRow.project_id,
        invoiceNumber: invoiceRow.invoice_number ?? "",
        vendor: invoiceRow.vendor ?? "",
        invoiceDate: invoiceRow.invoice_date ?? "",
        dueDate: invoiceRow.due_date ?? "",
        amount: toText(invoiceRow.amount),
        tax: toText(invoiceRow.tax),
        totalAmount: toText(invoiceRow.total_amount),
        currency: normalizeCurrency(invoiceRow.currency),
        categoryId: invoiceRow.category_id ?? "",
        status: invoiceRow.status === "paid" ? "paid" : "unpaid",
        notes: invoiceRow.notes ?? "",
        custom1: invoiceRow.custom1 ?? "",
        custom2: invoiceRow.custom2 ?? "",
        custom3: invoiceRow.custom3 ?? "",
        originalFileUrl: invoiceRow.original_file_url,
        uploadedAt: invoiceRow.uploaded_at,
        uploadedBy: invoiceRow.uploaded_by,
        lastEditedAt: invoiceRow.last_edited_at,
      });

      setLoading(false);
    };

    void load();
  }, [params.id, supabase]);

  const updateField = (key: keyof EditableInvoice, value: string) => {
    setInvoice((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveChanges = async () => {
    if (!invoice) return;
    const amount = invoice.amount ? Number(invoice.amount) : null;
    const tax = invoice.tax ? Number(invoice.tax) : null;
    const totalAmount = invoice.totalAmount ? Number(invoice.totalAmount) : null;

    const { error } = await supabase
      .from("invoices")
      .update({
        invoice_number: invoice.invoiceNumber || null,
        vendor: invoice.vendor || null,
        invoice_date: invoice.invoiceDate || null,
        due_date: invoice.dueDate || null,
        amount,
        tax,
        total_amount: totalAmount,
        currency: invoice.currency,
        category_id: invoice.categoryId || null,
        status: invoice.status,
        notes: invoice.notes || null,
        custom1: selectedColumns.includes("custom1") ? invoice.custom1 || null : null,
        custom2: selectedColumns.includes("custom2") ? invoice.custom2 || null : null,
        custom3: selectedColumns.includes("custom3") ? invoice.custom3 || null : null,
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (error) {
      setToast("Failed to update invoice.");
      return;
    }

    setToast("Invoice updated successfully.");
  };

  const deleteInvoice = async () => {
    if (!invoice) return;
    await supabase.from("invoices").delete().eq("id", invoice.id);
    router.push("/invoices");
  };

  const renderField = (column: ProjectColumn) => {
    if (!invoice || !selectedColumns.includes(column)) return null;

    if (column === "invoiceNumber") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Invoice #</label>
          <input
            value={invoice.invoiceNumber}
            onChange={(event) => updateField("invoiceNumber", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "vendor") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Vendor</label>
          <input
            value={invoice.vendor}
            onChange={(event) => updateField("vendor", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "invoiceDate") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Invoice Date</label>
          <input
            type="date"
            value={invoice.invoiceDate}
            onChange={(event) => updateField("invoiceDate", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "dueDate") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Due Date</label>
          <input
            type="date"
            value={invoice.dueDate}
            onChange={(event) => updateField("dueDate", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "amount") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Amount (excl. tax)</label>
          <input
            type="number"
            step="0.01"
            value={invoice.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
          <p className="text-xs text-snap-textDim">{formatAmountWithCurrency(invoice.amount, invoice.currency)}</p>
        </div>
      );
    }
    if (column === "tax") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Tax</label>
          <input
            type="number"
            step="0.01"
            value={invoice.tax}
            onChange={(event) => updateField("tax", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
          <p className="text-xs text-snap-textDim">{formatAmountWithCurrency(invoice.tax, invoice.currency)}</p>
        </div>
      );
    }
    if (column === "totalAmount") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">Total Amount</label>
          <input
            type="number"
            step="0.01"
            value={invoice.totalAmount}
            onChange={(event) => updateField("totalAmount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
          <p className="text-xs text-snap-textDim">{formatAmountWithCurrency(invoice.totalAmount, invoice.currency)}</p>
        </div>
      );
    }
    if (column === "notes") {
      return (
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-snap-textDim">Notes</label>
          <textarea
            rows={3}
            value={invoice.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "custom1" || column === "custom2" || column === "custom3") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{customLabels[column]}</label>
          <input
            value={invoice[column]}
            onChange={(event) => updateField(column, event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout pageTitle="Invoice Detail">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title="Invoice Detail" description="Review and update invoice data." />

        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Loading invoice...
          </div>
        ) : null}

        {!loading && !invoice ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Invoice not found.
          </div>
        ) : null}

        {!loading && invoice ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
            <article className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-5">
              <h2 className="text-base font-semibold text-snap-textMain">Original File</h2>
              {invoice.originalFileUrl ? (
                <div className="space-y-3">
                  {invoice.originalFileUrl.endsWith(".pdf") ? (
                    <iframe
                      title="Invoice file"
                      src={invoice.originalFileUrl}
                      className="h-80 w-full rounded border border-snap-border"
                    />
                  ) : (
                    <img
                      src={invoice.originalFileUrl}
                      alt="Invoice file"
                      className="max-h-80 w-full rounded border border-snap-border object-contain"
                    />
                  )}
                  <a
                    href={invoice.originalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-snap-textMain underline"
                  >
                    Download file
                  </a>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-snap-border bg-snap-bg p-8 text-sm text-snap-textDim">
                  No original file available for this invoice.
                </div>
              )}
            </article>

            <article className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {(Object.keys(PROJECT_COLUMN_LABELS) as ProjectColumn[]).map((column) => (
                  <div key={column}>{renderField(column)}</div>
                ))}

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Currency</label>
                  <select
                    value={invoice.currency}
                    onChange={(event) => updateField("currency", event.target.value as CurrencyCode)}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Category</label>
                  <select
                    value={invoice.categoryId}
                    onChange={(event) => updateField("categoryId", event.target.value)}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Status</label>
                  <select
                    value={invoice.status}
                    onChange={(event) => updateField("status", event.target.value as "paid" | "unpaid")}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <p className="border-t border-snap-border pt-4 text-xs text-snap-textDim">
                Uploaded on {formatDateTime(invoice.uploadedAt)} by {uploaderName} · Last edited{" "}
                {formatDateTime(invoice.lastEditedAt)}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain"
                >
                  Save Changes
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-md border border-snap-border px-4 py-2 text-sm text-red-400"
                  >
                    Delete Invoice
                  </button>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete Invoice"
        description="This action cannot be undone."
        confirmLabel="Delete Invoice"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteInvoice()}
      />
    </DashboardLayout>
  );
}
