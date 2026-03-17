"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProjectColumn } from "@/components/dashboard/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/context/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createClient } from "@/lib/supabase/client";

type CategoryOption = { id: string; name: string };
type CurrencyCode = "USD" | "ARS" | "EUR" | "GBP" | "BRL" | "UYU";

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "ARS", "EUR", "GBP", "BRL", "UYU"];

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

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  const normalized = (value ?? "").toUpperCase();
  const valid = new Set(CURRENCY_OPTIONS);
  return valid.has(normalized as CurrencyCode) ? (normalized as CurrencyCode) : "USD";
}

function getFileExtension(path: string | null) {
  if (!path) return "";
  const normalized = path.toLowerCase().split("?")[0];
  const parts = normalized.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invoice, setInvoice] = useState<EditableInvoice | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ProjectColumn[]>([]);
  const [customLabels, setCustomLabels] = useState({ custom1: "Custom 1", custom2: "Custom 2", custom3: "Custom 3" });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploaderName, setUploaderName] = useState<string>("-");
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [filePreviewError, setFilePreviewError] = useState(false);

  const canDelete = userRole === "org_admin";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("created") === "1") {
      setToast(t("invoices.savedSuccess"));
    }
  }, [t]);

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
        setSignedFileUrl(null);
        setLoading(false);
        return;
      }

      let nextSignedFileUrl: string | null = null;
      if (invoiceRow.original_file_url) {
        const { data: signedUrlData } = await supabase
          .storage
          .from("invoices")
          .createSignedUrl(invoiceRow.original_file_url, 3600);
        nextSignedFileUrl = signedUrlData?.signedUrl ?? null;
      }
      setSignedFileUrl(nextSignedFileUrl);
      setFilePreviewError(false);

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
          setUploaderName(name || uploaderRow.email || t("common.unknown"));
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
      setToast(t("invoices.failedUpdateInvoice"));
      return;
    }

    setToast(t("invoices.updatedSuccess"));
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
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("common.invoiceNumber")}</label>
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
        <div key={column} className="col-span-2 space-y-2">
          <label className="text-sm text-snap-textDim">{t("common.vendor")}</label>
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
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.invoiceDate")}</label>
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
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.dueDate")}</label>
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
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.amountExclTax")}</label>
          <input
            type="number"
            step="0.01"
            value={invoice.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "tax") {
      return (
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.tax")}</label>
          <input
            type="number"
            step="0.01"
            value={invoice.tax}
            onChange={(event) => updateField("tax", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "totalAmount") {
      return (
        <div key={column} className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.totalAmount")}</label>
          <input
            type="number"
            step="0.01"
            value={invoice.totalAmount}
            onChange={(event) => updateField("totalAmount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }
    if (column === "notes") {
      return (
        <div key={column} className="col-span-2 space-y-2">
          <label className="text-sm text-snap-textDim">{t("common.notes")}</label>
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
        <div key={column} className="space-y-2">
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
    <DashboardLayout pageTitle={t("invoices.invoiceDetail")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title={t("invoices.invoiceDetail")} description={t("invoices.reviewUpdate")} />

        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("invoices.loadingInvoice")}
          </div>
        ) : null}

        {!loading && !invoice ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("invoices.notFound")}
          </div>
        ) : null}

        {!loading && invoice ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
            <article className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-5">
              <h2 className="text-base font-semibold text-snap-textMain">{t("invoices.originalFile")}</h2>
              {signedFileUrl && !filePreviewError ? (
                <div className="space-y-3">
                  {getFileExtension(invoice.originalFileUrl) === "pdf" ? (
                    <iframe
                      title={t("invoices.invoiceFile")}
                      src={signedFileUrl}
                      onError={() => setFilePreviewError(true)}
                      className="h-80 w-full rounded border border-snap-border"
                    />
                  ) : getFileExtension(invoice.originalFileUrl) === "jpg" ||
                      getFileExtension(invoice.originalFileUrl) === "jpeg" ||
                      getFileExtension(invoice.originalFileUrl) === "png" ? (
                    <img
                      src={signedFileUrl}
                      alt={t("invoices.invoiceFile")}
                      onError={() => setFilePreviewError(true)}
                      className="max-h-80 w-full rounded border border-snap-border object-contain"
                    />
                  ) : (
                    <div className="rounded-md border border-dashed border-snap-border bg-snap-bg p-8 text-sm text-snap-textDim">
                      {t("invoices.previewNotAvailable")}
                    </div>
                  )}
                  <a
                    href={signedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-snap-textMain underline"
                  >
                    {t("invoices.downloadFile")}
                  </a>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-snap-border bg-snap-bg p-8 text-sm text-snap-textDim">
                  {t("invoices.previewNotAvailable")}
                </div>
              )}
            </article>

            <article className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-5">
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(PROJECT_COLUMN_LABELS) as ProjectColumn[]).map((column) => renderField(column))}

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">{t("invoices.currency")}</label>
                  <select
                    value={invoice.currency}
                    onChange={(event) => updateField("currency", event.target.value as CurrencyCode)}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`invoices.currencyOptions.${option}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">{t("categories.title")}</label>
                  <select
                    value={invoice.categoryId}
                    onChange={(event) => updateField("categoryId", event.target.value)}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="">{t("invoices.selectCategory")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">{t("common.status")}</label>
                  <select
                    value={invoice.status}
                    onChange={(event) => updateField("status", event.target.value as "paid" | "unpaid")}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="paid">{t("status.paid")}</option>
                    <option value="unpaid">{t("status.unpaid")}</option>
                  </select>
                </div>
              </div>

              <p className="border-t border-snap-border pt-4 text-xs text-snap-textDim">
                {t("invoices.uploadedOnBy", {
                  uploadedAt: formatDateTime(invoice.uploadedAt),
                  uploaderName,
                  lastEditedAt: formatDateTime(invoice.lastEditedAt),
                })}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain"
                >
                  {t("users.saveChanges")}
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-md border border-snap-border px-4 py-2 text-sm text-red-400"
                  >
                    {t("invoices.deleteInvoiceTitle")}
                  </button>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={deleteOpen}
        title={t("invoices.deleteInvoiceTitle")}
        description={t("common.cannotBeUndone")}
        confirmLabel={t("invoices.deleteInvoiceTitle")}
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteInvoice()}
      />
    </DashboardLayout>
  );
}
