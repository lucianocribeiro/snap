"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectColumn } from "@/components/dashboard/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PROJECT_COLUMN_LABELS } from "@/components/projects/constants";
import { CategoryRequestModal } from "@/components/shared/CategoryRequestModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { useAuth } from "@/lib/context/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createClient } from "@/lib/supabase/client";

type ProjectOption = {
  id: string;
  name: string;
  status: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type CurrencyCode = "USD" | "ARS" | "EUR" | "GBP" | "BRL" | "UYU";

type InvoiceFormState = {
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
};

type ExtractedField = {
  id: string;
  key: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

type ColumnMapping = {
  extractedKey: string;
  projectColumn: string | null;
};

const CATEGORY_LIMIT = 20;
const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "ARS", "EUR", "GBP", "BRL", "UYU"];

const INITIAL_FORM: InvoiceFormState = {
  invoiceNumber: "",
  vendor: "",
  invoiceDate: "",
  dueDate: "",
  amount: "",
  tax: "",
  totalAmount: "",
  currency: "USD",
  categoryId: "",
  status: "unpaid",
  notes: "",
  custom1: "",
  custom2: "",
  custom3: "",
};

const DEFAULT_COLUMN_BY_EXTRACTED_KEY: Record<string, ProjectColumn | null> = {
  invoiceDate: "invoiceDate",
  vendor: "vendor",
  totalAmount: "totalAmount",
  amount: "amount",
  tax: "tax",
  invoiceNumber: "invoiceNumber",
  dueDate: "dueDate",
};

function confidenceDotClass(confidence: ExtractedField["confidence"]) {
  if (confidence === "high") return "bg-emerald-400";
  if (confidence === "medium") return "bg-amber-300";
  return "bg-red-400";
}

function confidenceLabel(confidence: ExtractedField["confidence"]) {
  if (confidence === "high") return "confidence.high";
  if (confidence === "medium") return "confidence.reviewSuggested";
  return "confidence.manualInputRequired";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isProjectColumn(value: string): value is ProjectColumn {
  return Object.prototype.hasOwnProperty.call(PROJECT_COLUMN_LABELS, value);
}

function toInputDateFormat(value: string | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}

function normalizeCurrency(value: string | undefined): CurrencyCode {
  const normalized = (value ?? "").trim().toUpperCase();
  const validOptions = new Set(CURRENCY_OPTIONS);
  return validOptions.has(normalized as CurrencyCode) ? (normalized as CurrencyCode) : "USD";
}

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { t } = useLanguage();
  const { user, organizationId, canEdit } = useAuth();
  const [step, setStep] = useState(1);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isReadingInvoice, setIsReadingInvoice] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [invoiceValidationError, setInvoiceValidationError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<ProjectColumn[]>([]);
  const [customColumnLabels, setCustomColumnLabels] = useState({
    custom1: t("common.custom1"),
    custom2: t("common.custom2"),
    custom3: t("common.custom3"),
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestCategoryName, setRequestCategoryName] = useState("");
  const [formState, setFormState] = useState<InvoiceFormState>(INITIAL_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [mappingByFieldId, setMappingByFieldId] = useState<Record<string, string>>({});
  const [suggestedMappings, setSuggestedMappings] = useState<ColumnMapping[]>([]);
  const [vendorNameFromOCR, setVendorNameFromOCR] = useState<string | null>(null);
  const steps = [
    t("invoices.steps.selectProject"),
    t("invoices.steps.upload"),
    t("invoices.steps.reviewExtraction"),
    t("invoices.steps.mapColumns"),
    t("invoices.steps.confirm"),
  ];

  useEffect(() => {
    if (!canEdit) {
      router.replace("/invoices");
    }
  }, [canEdit, router]);

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name, status").order("name");
      setProjects((data as ProjectOption[] | null) ?? []);
    };
    void loadProjects();
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadProjectConfig = async () => {
      const [{ data: projectRow }, { data: categoryRows }] = await Promise.all([
        supabase
          .from("projects")
          .select("selected_columns, custom_column_labels")
          .eq("id", selectedProjectId)
          .maybeSingle(),
        supabase.from("categories").select("id, name").eq("project_id", selectedProjectId).order("name"),
      ]);

      setSelectedColumns((projectRow?.selected_columns as ProjectColumn[]) ?? []);
      setCustomColumnLabels({
        custom1: projectRow?.custom_column_labels?.custom1 ?? t("common.custom1"),
        custom2: projectRow?.custom_column_labels?.custom2 ?? t("common.custom2"),
        custom3: projectRow?.custom_column_labels?.custom3 ?? t("common.custom3"),
      });
      setCategories((categoryRows as CategoryOption[] | null) ?? []);
    };

    void loadProjectConfig();
  }, [selectedProjectId, supabase, t]);

  const activeProjects = projects.filter((project) => project.status?.toLowerCase() !== "archived");
  const canContinueStep1 = Boolean(selectedProjectId);
  const canSave = Boolean(formState.categoryId && formState.status);

  const showToast = (message: string, type: "success" | "error") => {
    setToastType(type);
    setToast(message);
  };

  const goToStep = (nextStep: number) => {
    const boundedStep = Math.min(Math.max(nextStep, 1), steps.length);
    setStep((currentStep) => {
      if (currentStep === boundedStep) return currentStep;
      setStepHistory((previousHistory) => [...previousHistory, currentStep]);
      return boundedStep;
    });
  };

  const goBackStep = () => {
    setStepHistory((previousHistory) => {
      if (previousHistory.length === 0) {
        setStep((currentStep) => Math.max(1, currentStep - 1));
        return previousHistory;
      }

      const targetStep = previousHistory[previousHistory.length - 1];
      setStep(targetStep);
      return previousHistory.slice(0, -1);
    });
  };

  const updateField = (key: keyof InvoiceFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const getProjectColumnLabel = (column: ProjectColumn) => {
    if (column === "custom1" || column === "custom2" || column === "custom3") {
      return customColumnLabels[column] || PROJECT_COLUMN_LABELS[column];
    }
    return PROJECT_COLUMN_LABELS[column];
  };

  const applyInitialMappings = (nextFields: ExtractedField[], nextSuggested: ColumnMapping[]) => {
    const suggestedMap = new Map(nextSuggested.map((row) => [row.extractedKey, row.projectColumn]));

    const nextMapping: Record<string, string> = {};
    nextFields.forEach((field) => {
      const suggested = suggestedMap.get(field.key);
      const intelligentDefault = DEFAULT_COLUMN_BY_EXTRACTED_KEY[field.key];
      const candidate = suggested ?? intelligentDefault ?? "";

      if (candidate && isProjectColumn(candidate) && selectedColumns.includes(candidate)) {
        nextMapping[field.id] = candidate;
      } else {
        nextMapping[field.id] = "";
      }
    });

    setMappingByFieldId(nextMapping);
  };

  const resolveOrganizationId = async () => {
    if (organizationId) return organizationId;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    return data?.organization_id ?? null;
  };

  const openRequestModal = (name: string) => {
    setRequestCategoryName(name);
    setRequestModalOpen(true);
  };

  const addCategoryToProject = async () => {
    const normalizedName = normalizeCategory(categoryInput);
    if (!selectedProjectId || !normalizedName) return;

    const alreadyExists = categories.some((category) => normalizeCategory(category.name) === normalizedName);
    if (alreadyExists) {
      showToast(t("invoices.categoryAlreadyExists"), "error");
      return;
    }

    if (categories.length >= CATEGORY_LIMIT) {
      openRequestModal(normalizedName);
      return;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      showToast(t("settings.sessionExpired"), "error");
      return;
    }

    const resolvedOrganizationId = await resolveOrganizationId();

    setIsAddingCategory(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({
        project_id: selectedProjectId,
        ...(resolvedOrganizationId ? { organization_id: resolvedOrganizationId } : {}),
        name: normalizedName,
        created_by: authUser.id,
      })
      .select("id, name")
      .single();

    if (error || !data) {
      showToast(t("invoices.failedAddCategory"), "error");
      setIsAddingCategory(false);
      return;
    }

    setCategories((previous) => [...previous, data as CategoryOption].sort((a, b) => a.name.localeCompare(b.name)));
    setFormState((previous) => ({ ...previous, categoryId: data.id }));
    setCategoryInput("");
    setIsAddingCategory(false);
  };

  const submitCategoryRequest = async ({
    categoryName,
    note,
  }: {
    categoryName: string;
    note: string;
  }) => {
    if (!selectedProjectId) {
      throw new Error(t("invoices.selectProjectBeforeCategoryRequest"));
    }

    const authUserId = user?.id;
    if (!authUserId) {
      throw new Error(t("settings.sessionExpired"));
    }

    const resolvedOrganizationId = await resolveOrganizationId();
    if (!resolvedOrganizationId) {
      throw new Error(t("invoices.resolveOrganizationFailed"));
    }

    const { error } = await supabase.from("category_requests").insert({
      project_id: selectedProjectId,
      organization_id: resolvedOrganizationId,
      requested_by: authUserId,
      category_name: categoryName,
      note: note || null,
      status: "pending",
    });

    if (error) {
      throw new Error(t("categories.failedSendRequest"));
    }

    setRequestModalOpen(false);
    setCategoryInput("");
    showToast(t("projects.form.categoryRequestSent"), "success");
  };

  const runOCRForFile = async (nextFile: File) => {
    if (!selectedProjectId) {
      showToast(t("invoices.selectProjectBeforeUpload"), "error");
      return;
    }

    const resolvedOrganizationId = await resolveOrganizationId();
    if (!resolvedOrganizationId) {
      showToast(t("invoices.resolveOrganizationTryAgain"), "error");
      return;
    }

    setToast(null);
    setInvoiceValidationError(null);
    setIsReadingInvoice(true);

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

    setFile(nextFile);
    setFilePreviewUrl(nextPreviewUrl);

    const cleanName = sanitizeFileName(nextFile.name);
    const path = `${resolvedOrganizationId}/${selectedProjectId}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage.from("invoices").upload(path, nextFile, {
      contentType: nextFile.type,
      upsert: false,
    });

    if (uploadError) {
      setIsReadingInvoice(false);
      showToast(t("invoices.ocrReadFailedManual"), "error");
      goToStep(5);
      return;
    }

    setStoragePath(path);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("process-invoice", {
      body: {
        fileUrl: path,
        projectId: selectedProjectId,
        language: "en" as const,
      },
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (error || !data) {
      setIsReadingInvoice(false);
      showToast(t("invoices.ocrReadFailedManual"), "error");
      goToStep(5);
      return;
    }

    const nextExtractedFields: ExtractedField[] = ((data.extractedFields as Array<{
      key: string;
      label: string;
      value: string;
      confidence: "high" | "medium" | "low";
    }>) ?? []).map((field, index) => ({
      id: `${field.key}-${index}`,
      key: field.key,
      label: field.label,
      value: field.value,
      confidence: field.confidence,
    }));

    const nextSuggestedMappings = (data.suggestedMappings as ColumnMapping[] | undefined) ?? [];
    const overallConfidence = typeof data.overallConfidence === "number" ? data.overallConfidence : 0;
    const extractedCurrency = nextExtractedFields.find((field) => field.key === "currency")?.value;

    if (overallConfidence < 0.3 && nextExtractedFields.length < 3) {
      setIsReadingInvoice(false);
      setInvoiceValidationError(t("invoices.invalidInvoiceFile"));
      return;
    }

    setExtractedFields(nextExtractedFields);
    setSuggestedMappings(nextSuggestedMappings);
    setVendorNameFromOCR((data.vendorName as string | null) ?? null);
    applyInitialMappings(nextExtractedFields, nextSuggestedMappings);
    setFormState((prev) => ({ ...prev, currency: normalizeCurrency(extractedCurrency) }));

    setIsReadingInvoice(false);
    setInvoiceValidationError(null);
    goToStep(3);
  };

  const handleFileSelect = (nextFile: File | null) => {
    if (!nextFile) return;
    if (nextFile.size > 10 * 1024 * 1024) {
      showToast(t("invoices.maxFileSize"), "error");
      return;
    }
    void runOCRForFile(nextFile);
  };

  const applyMappingsToForm = () => {
    const valuesByTarget: Partial<Record<ProjectColumn, string>> = {};

    extractedFields.forEach((field) => {
      const target = mappingByFieldId[field.id];
      if (!target || !isProjectColumn(target)) return;
      valuesByTarget[target] = field.value;
    });

    const mappedInvoiceDate = toInputDateFormat(valuesByTarget.invoiceDate);
    const mappedDueDate = toInputDateFormat(valuesByTarget.dueDate);

    setFormState((prev) => ({
      ...prev,
      invoiceNumber: valuesByTarget.invoiceNumber ?? prev.invoiceNumber,
      vendor: valuesByTarget.vendor ?? prev.vendor,
      invoiceDate: mappedInvoiceDate || prev.invoiceDate,
      dueDate: mappedDueDate || prev.dueDate,
      amount: valuesByTarget.amount ?? prev.amount,
      tax: valuesByTarget.tax ?? prev.tax,
      totalAmount: valuesByTarget.totalAmount ?? prev.totalAmount,
      custom1: valuesByTarget.custom1 ?? prev.custom1,
      custom2: valuesByTarget.custom2 ?? prev.custom2,
      custom3: valuesByTarget.custom3 ?? prev.custom3,
      notes: valuesByTarget.notes ?? prev.notes,
    }));
  };

  const persistVendorMapping = async (columnMappings: Record<string, string>) => {
    const vendorName = (formState.vendor || vendorNameFromOCR || "").trim();
    if (!vendorName || Object.keys(columnMappings).length === 0) return;

    const { data: existing } = await supabase
      .from("vendor_mappings")
      .select("id, column_mappings")
      .eq("vendor_name", vendorName)
      .maybeSingle();

    if (!existing) {
      await supabase.from("vendor_mappings").insert({
        vendor_name: vendorName,
        column_mappings: columnMappings,
      });
      return;
    }

    const previous = JSON.stringify(existing.column_mappings ?? {});
    const next = JSON.stringify(columnMappings);
    if (previous !== next) {
      await supabase.from("vendor_mappings").update({
        column_mappings: columnMappings,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    }
  };

  const saveInvoice = async () => {
    setToast(null);
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast(t("settings.sessionExpired"), "error");
      setIsSaving(false);
      return;
    }

    const amount = formState.amount ? Number(formState.amount) : null;
    const tax = formState.tax ? Number(formState.tax) : null;
    const totalAmount = formState.totalAmount
      ? Number(formState.totalAmount)
      : (amount ?? 0) + (tax ?? 0);

    const columnMappings: Record<string, string> = {};
    extractedFields.forEach((field) => {
      const target = mappingByFieldId[field.id];
      if (target && isProjectColumn(target)) {
        columnMappings[field.key] = target;
      }
    });

    await persistVendorMapping(columnMappings);

    const payload = {
      project_id: selectedProjectId,
      invoice_number: formState.invoiceNumber || null,
      vendor: formState.vendor || null,
      invoice_date: formState.invoiceDate || null,
      due_date: formState.dueDate || null,
      amount,
      tax,
      total_amount: Number.isFinite(totalAmount) ? totalAmount : null,
      currency: formState.currency,
      category_id: formState.categoryId,
      status: formState.status,
      notes: formState.notes || null,
      custom1: selectedColumns.includes("custom1") ? formState.custom1 || null : null,
      custom2: selectedColumns.includes("custom2") ? formState.custom2 || null : null,
      custom3: selectedColumns.includes("custom3") ? formState.custom3 || null : null,
      uploaded_by: user.id,
      original_file_url: storagePath,
      column_mappings: columnMappings,
    };

    const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();

    if (error || !data) {
      showToast(t("invoices.failedSaveInvoice"), "error");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.push(`/invoices/${data.id}?created=1`);
  };

  const renderField = (column: ProjectColumn) => {
    if (!selectedColumns.includes(column)) return null;

    if (column === "invoiceNumber") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("common.invoiceNumber")}</label>
          <input
            value={formState.invoiceNumber}
            onChange={(event) => updateField("invoiceNumber", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "vendor") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("common.vendor")}</label>
          <input
            value={formState.vendor}
            onChange={(event) => updateField("vendor", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "invoiceDate") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.invoiceDate")}</label>
          <input
            type="date"
            value={formState.invoiceDate}
            onChange={(event) => updateField("invoiceDate", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "dueDate") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.dueDate")}</label>
          <input
            type="date"
            value={formState.dueDate}
            onChange={(event) => updateField("dueDate", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "amount") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.amountExclTax")}</label>
          <input
            type="number"
            step="0.01"
            value={formState.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "tax") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.tax")}</label>
          <input
            type="number"
            step="0.01"
            value={formState.tax}
            onChange={(event) => updateField("tax", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "totalAmount") {
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("invoices.totalAmount")}</label>
          <input
            type="number"
            step="0.01"
            value={formState.totalAmount}
            onChange={(event) => updateField("totalAmount", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "notes") {
      return (
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-snap-textDim">{t("common.notes")}</label>
          <textarea
            rows={3}
            value={formState.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    if (column === "custom1" || column === "custom2" || column === "custom3") {
      const label = customColumnLabels[column];
      return (
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{label}</label>
          <input
            value={formState[column]}
            onChange={(event) => updateField(column, event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <DashboardLayout pageTitle={t("invoices.addInvoice")}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader title={t("invoices.addInvoice")} description={t("invoices.manualEntryDescription")} />

        {toast ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              toastType === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {toast}
          </div>
        ) : null}

        <StepIndicator steps={steps} currentStep={step} />

        <section className="relative rounded-xl border border-snap-border bg-snap-surface p-6">
          {isReadingInvoice ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-snap-bg/80">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-snap-border border-t-snap-textMain" />
                <p className="text-sm text-snap-textMain">{t("invoices.readingInvoice")}</p>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-snap-textMain">{t("invoices.steps.selectProject")}</h2>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              >
                <option value="">{t("invoices.selectActiveProject")}</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-snap-textMain">{t("invoices.uploadInvoiceFile")}</h2>
              <label className="block rounded-lg border border-dashed border-snap-border bg-snap-bg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
                />
                <span className="text-sm text-snap-textMain">{t("invoices.uploadFileHint")}</span>
              </label>

              {file ? (
                <div className="space-y-2 rounded-md border border-snap-border bg-snap-bg p-3">
                  <p className="text-sm text-snap-textDim">{t("invoices.selectedFile", { name: file.name })}</p>
                  {filePreviewUrl && file.type.startsWith("image/") ? (
                    <img src={filePreviewUrl} alt={t("invoices.invoicePreviewAlt")} className="max-h-72 rounded border border-snap-border" />
                  ) : null}
                  {filePreviewUrl && file.type === "application/pdf" ? (
                    <iframe title={t("invoices.invoicePreviewAlt")} src={filePreviewUrl} className="h-72 w-full rounded border border-snap-border" />
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  title={t("invoices.availableOnMobileApp")}
                  className="cursor-not-allowed rounded-md border border-snap-border px-3 py-2 text-sm text-snap-textDim opacity-70"
                >
                  {t("invoices.takePhoto")}
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(5)}
                  className="rounded-md border border-snap-border bg-snap-card px-3 py-2 text-sm font-medium text-snap-textMain"
                >
                  {t("invoices.skipOCR")}
                </button>
              </div>

              {invoiceValidationError ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  <div className="flex items-start justify-between gap-3">
                    <p>{invoiceValidationError}</p>
                    <button
                      type="button"
                      onClick={() => setInvoiceValidationError(null)}
                      className="text-xs font-medium text-red-200 underline underline-offset-2 hover:text-red-100"
                    >
                      {t("common.dismiss")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3 rounded-lg border border-snap-border bg-snap-bg p-4">
                <h2 className="text-base font-semibold text-snap-textMain">{t("invoices.invoicePreview")}</h2>
                {filePreviewUrl && file?.type === "application/pdf" ? (
                  <iframe title={t("invoices.invoicePreviewAlt")} src={filePreviewUrl} className="h-80 w-full rounded border border-snap-border" />
                ) : null}
                {filePreviewUrl && file?.type.startsWith("image/") ? (
                  <img src={filePreviewUrl} alt={t("invoices.invoicePreviewAlt")} className="max-h-80 w-full rounded border border-snap-border object-contain" />
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-snap-border bg-snap-bg p-4">
                <h2 className="text-base font-semibold text-snap-textMain">{t("invoices.extractedFields")}</h2>
                {extractedFields.length === 0 ? (
                  <p className="text-sm text-snap-textDim">{t("invoices.noExtractedFields")}</p>
                ) : (
                  <div className="space-y-3">
                    {extractedFields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-snap-textDim">{field.label}</label>
                          <span
                            title={t(confidenceLabel(field.confidence))}
                            className={`inline-block h-2.5 w-2.5 rounded-full ${confidenceDotClass(field.confidence)}`}
                          />
                        </div>
                        <input
                          value={field.value}
                          onChange={(event) =>
                            setExtractedFields((prev) =>
                              prev.map((current) =>
                                current.id === field.id ? { ...current, value: event.target.value } : current,
                              ),
                            )
                          }
                          className="w-full rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-snap-textMain">{t("invoices.mapColumns")}</h2>
              {extractedFields.length === 0 ? (
                <p className="text-sm text-snap-textDim">{t("invoices.noOCRFields")}</p>
              ) : (
                <div className="space-y-3">
                  {extractedFields.map((field) => (
                    <div key={field.id} className="grid gap-2 rounded-md border border-snap-border bg-snap-bg p-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-snap-textMain">{field.label}</p>
                        <p className="text-sm text-snap-textDim">{field.value}</p>
                      </div>
                      <div>
                        <select
                          value={mappingByFieldId[field.id] ?? ""}
                          onChange={(event) =>
                            setMappingByFieldId((prev) => ({ ...prev, [field.id]: event.target.value }))
                          }
                          className="w-full rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
                        >
                          <option value="">{t("invoices.doNotImport")}</option>
                          {selectedColumns.map((column) => (
                            <option key={column} value={column}>
                              {getProjectColumnLabel(column)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-snap-textMain">{t("invoices.confirmAndSave")}</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Invoice # | Invoice Date */}
                {renderField("invoiceNumber")}
                {renderField("invoiceDate")}

                {/* Row 2: Due Date | Currency */}
                {renderField("dueDate")}
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">{t("invoices.currency")}</label>
                  <select
                    value={formState.currency}
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

                {/* Row 3: Amount | Tax */}
                {renderField("amount")}
                {renderField("tax")}

                {/* Row 4: Total Amount | Status */}
                {renderField("totalAmount")}
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">{t("common.status")} *</label>
                  <select
                    value={formState.status}
                    onChange={(event) => updateField("status", event.target.value as "paid" | "unpaid")}
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="paid">{t("status.paid")}</option>
                    <option value="unpaid">{t("status.unpaid")}</option>
                  </select>
                </div>

                {/* Row 5: Vendor (full width) */}
                <div className="col-span-2">{renderField("vendor")}</div>

                {/* Row 6: Category (full width) */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm text-snap-textDim">{t("categories.title")} *</label>
                  <select
                    value={formState.categoryId}
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
                  <p className="text-xs text-snap-textDim">{t("invoices.categoriesCount", { count: categories.length, limit: CATEGORY_LIMIT })}</p>
                  <div className="flex gap-2">
                    <input
                      value={categoryInput}
                      onChange={(event) => setCategoryInput(event.target.value)}
                      placeholder={t("projects.form.addCategoryPlaceholder")}
                      className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void addCategoryToProject()}
                      disabled={
                        !selectedProjectId ||
                        normalizeCategory(categoryInput).length === 0 ||
                        isAddingCategory
                      }
                      className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain disabled:opacity-50"
                    >
                      {isAddingCategory ? t("invoices.addingCategory") : t("common.add")}
                    </button>
                  </div>
                  {categories.length >= CATEGORY_LIMIT ? (
                    <p className="text-xs text-snap-textDim">
                      {t("categories.limitReached")}
                    </p>
                  ) : null}
                </div>

                {/* Row 7: Notes (full width) */}
                <div className="col-span-2">{renderField("notes")}</div>

                {/* Custom columns (full width) */}
                {(["custom1", "custom2", "custom3"] as ProjectColumn[]).map((col) =>
                  selectedColumns.includes(col) ? (
                    <div key={col} className="col-span-2">{renderField(col)}</div>
                  ) : null
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-snap-border pt-4">
            <button
              type="button"
              disabled={step === 1 || isSaving || isReadingInvoice}
              onClick={goBackStep}
              className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain disabled:opacity-50"
            >
              {t("common.back")}
            </button>
            {step < 5 ? (
              <button
                type="button"
                disabled={isReadingInvoice || (step === 1 && !canContinueStep1)}
                onClick={() => {
                  if (step === 3) {
                    goToStep(4);
                    return;
                  }
                  if (step === 4) {
                    applyMappingsToForm();
                    goToStep(5);
                    return;
                  }
                  goToStep(step + 1);
                }}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain disabled:opacity-50"
              >
                {step === 4 ? t("invoices.confirmMapping") : t("common.next")}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSave || isSaving}
                onClick={() => void saveInvoice()}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain disabled:opacity-50"
              >
                {isSaving ? t("settings.saving") : t("invoices.saveInvoice")}
              </button>
            )}
          </div>
        </section>
        </div>
      </DashboardLayout>

      <CategoryRequestModal
        open={requestModalOpen}
        categoryName={requestCategoryName}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={submitCategoryRequest}
      />
    </>
  );
}
