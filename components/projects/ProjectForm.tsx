"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { CategoryRequestModal } from "@/components/shared/CategoryRequestModal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ProjectColumn, ProjectFormState } from "@/components/dashboard/types";
import {
  DEFAULT_SELECTED_COLUMNS,
  PERIOD_OPTIONS,
  PROJECT_COLUMN_LABELS,
  PROJECT_STEPS,
} from "@/components/projects/constants";

const CATEGORY_LIMIT = 20;

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  initialState?: ProjectFormState;
  initialPeriodType?: ProjectFormState["periodType"];
  initialInvoicesCount?: number;
};

type PendingCategoryRequest = {
  categoryName: string;
  note: string;
};

const EMPTY_STATE: ProjectFormState = {
  name: "",
  description: "",
  periodType: "Monthly",
  customPeriods: [],
  selectedColumns: DEFAULT_SELECTED_COLUMNS,
  customColumnLabels: {
    custom1: "Custom 1",
    custom2: "Custom 2",
    custom3: "Custom 3",
  },
  categories: [],
};

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapColumnForDb(column: ProjectColumn) {
  return column;
}

export function ProjectForm({
  mode,
  projectId,
  initialState,
  initialPeriodType,
  initialInvoicesCount = 0,
}: ProjectFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { organizationId } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestCategoryName, setRequestCategoryName] = useState("");
  const [pendingCategoryRequests, setPendingCategoryRequests] = useState<PendingCategoryRequest[]>([]);
  const [formState, setFormState] = useState<ProjectFormState>(initialState ?? EMPTY_STATE);

  const steps = [
    t("projects.form.steps.basicInfo"),
    t("projects.form.steps.period"),
    t("projects.form.steps.columns"),
    t("projects.form.steps.categories"),
    t("projects.form.steps.review"),
  ];

  const canContinueFromStep1 = formState.name.trim().length > 0;
  const canContinueFromStep3 = formState.selectedColumns.length > 0;
  const canContinueFromStep4 = formState.categories.length > 0;
  const periodTypeChangedWithInvoices =
    mode === "edit" &&
    initialInvoicesCount > 0 &&
    initialPeriodType &&
    initialPeriodType !== formState.periodType;

  const resolveOrganizationId = async (userId: string) => {
    if (organizationId) return organizationId;

    const { data } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", userId)
      .maybeSingle();

    return data?.organization_id ?? null;
  };

  const getColumnLabel = (column: ProjectColumn) => {
    if (column === "custom1" || column === "custom2" || column === "custom3") {
      return formState.customColumnLabels[column] || PROJECT_COLUMN_LABELS[column];
    }

    if (column === "invoiceNumber") return t("common.invoiceNumber");
    if (column === "vendor") return t("common.vendor");
    if (column === "invoiceDate") return t("invoices.invoiceDate");
    if (column === "dueDate") return t("invoices.dueDate");
    if (column === "amount") return t("invoices.amountExclTax");
    if (column === "tax") return t("invoices.tax");
    if (column === "totalAmount") return t("invoices.totalAmount");
    if (column === "category") return t("categories.title");
    if (column === "status") return t("common.status");
    if (column === "notes") return t("common.notes");

    return PROJECT_COLUMN_LABELS[column];
  };

  const sortedColumns = (Object.keys(PROJECT_COLUMN_LABELS) as ProjectColumn[]).sort((a, b) => {
    const labelA = getColumnLabel(a);
    const labelB = getColumnLabel(b);
    return labelA.localeCompare(labelB);
  });

  const goToStep = (nextStep: number) => {
    const boundedStep = Math.min(Math.max(nextStep, 1), PROJECT_STEPS.length);
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

  const openRequestModal = (name: string) => {
    setRequestCategoryName(name);
    setRequestModalOpen(true);
  };

  const addCategory = () => {
    const normalized = normalizeCategory(categoryInput);
    if (!normalized || formState.categories.includes(normalized)) return;
    if (formState.categories.length >= CATEGORY_LIMIT) {
      openRequestModal(normalized);
      return;
    }

    setFormState((prev) => ({ ...prev, categories: [...prev.categories, normalized] }));
    setCategoryInput("");
  };

  const submitCategoryRequest = async ({
    categoryName,
    note,
  }: {
    categoryName: string;
    note: string;
  }) => {
    if (formState.categories.includes(categoryName)) {
      throw new Error(t("projects.form.errors.categoryAlreadyExists"));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(t("settings.sessionExpired"));
    }

    const resolvedOrganizationId = await resolveOrganizationId(user.id);
    if (!resolvedOrganizationId) {
      throw new Error(t("projects.form.errors.resolveOrganization"));
    }

    if (mode === "create" && !projectId) {
      setPendingCategoryRequests((previous) => [...previous, { categoryName, note }]);
      setToast(t("projects.form.categoryRequestQueued"));
      setRequestModalOpen(false);
      setCategoryInput("");
      return;
    }

    const { error } = await supabase.from("category_requests").insert({
      project_id: projectId,
      organization_id: resolvedOrganizationId,
      requested_by: user.id,
      category_name: categoryName,
      note: note || null,
      status: "pending",
    });

    if (error) {
      throw new Error(t("categories.failedSendRequest"));
    }

    setToast(t("projects.form.categoryRequestSent"));
    setRequestModalOpen(false);
    setCategoryInput("");
  };

  const toggleColumn = (column: ProjectColumn) => {
    setFormState((prev) => {
      const exists = prev.selectedColumns.includes(column);
      return {
        ...prev,
        selectedColumns: exists
          ? prev.selectedColumns.filter((current) => current !== column)
          : [...prev.selectedColumns, column],
      };
    });
  };

  const addCustomPeriod = () => {
    if (formState.customPeriods.length >= 24) return;
    const id = crypto.randomUUID();
    setFormState((prev) => ({
      ...prev,
      customPeriods: [...prev.customPeriods, { id, name: "", startDate: "", endDate: "" }],
    }));
  };

  const updateCustomPeriod = (
    periodId: string,
    field: "name" | "startDate" | "endDate",
    value: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      customPeriods: prev.customPeriods.map((period) =>
        period.id === periodId ? { ...period, [field]: value } : period,
      ),
    }));
  };

  const removeCustomPeriod = (periodId: string) => {
    setFormState((prev) => ({
      ...prev,
      customPeriods: prev.customPeriods.filter((period) => period.id !== periodId),
    }));
  };

  const saveProject = async () => {
    setIsSaving(true);
    setToast(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setToast(t("settings.sessionExpired"));
      setIsSaving(false);
      return;
    }

    const resolvedOrganizationId = await resolveOrganizationId(user.id);

    const projectPayload = {
      name: formState.name.trim(),
      description: formState.description.trim() || null,
      period_type: formState.periodType,
      selected_columns: formState.selectedColumns.map(mapColumnForDb),
      custom_column_labels: formState.customColumnLabels,
    };

    let targetProjectId = projectId;

    if (mode === "create") {
      const { data, error } = await supabase.from("projects").insert(projectPayload).select("id").single();
      if (error || !data) {
        setToast(t("projects.form.errors.createProject"));
        setIsSaving(false);
        return;
      }
      targetProjectId = data.id;
    } else if (projectId) {
      const { error } = await supabase.from("projects").update(projectPayload).eq("id", projectId);
      if (error) {
        setToast(t("projects.form.errors.updateProject"));
        setIsSaving(false);
        return;
      }
    }

    if (!targetProjectId) {
      setToast(t("projects.form.errors.missingProjectId"));
      setIsSaving(false);
      return;
    }

    await supabase.from("project_periods").delete().eq("project_id", targetProjectId);
    if (formState.periodType === "Custom" && formState.customPeriods.length > 0) {
      const customRows = formState.customPeriods
        .filter((period) => period.name && period.startDate && period.endDate)
        .map((period) => ({
          project_id: targetProjectId,
          name: period.name,
          start_date: period.startDate,
          end_date: period.endDate,
        }));

      if (customRows.length > 0) {
        const { error } = await supabase.from("project_periods").insert(customRows);
        if (error) {
          setToast(t("projects.form.errors.customPeriodsUpdate"));
          setIsSaving(false);
          return;
        }
      }
    }

    await supabase.from("categories").delete().eq("project_id", targetProjectId);
    const categoryRows = formState.categories.map((name) => ({
      project_id: targetProjectId,
      ...(resolvedOrganizationId ? { organization_id: resolvedOrganizationId } : {}),
      name,
      created_by: user.id,
    }));
    if (categoryRows.length > 0) {
      const { error } = await supabase.from("categories").insert(categoryRows);
      if (error) {
        setToast(t("projects.form.errors.categoriesUpdate"));
        setIsSaving(false);
        return;
      }
    }

    if (pendingCategoryRequests.length > 0 && resolvedOrganizationId) {
      const requestRows = pendingCategoryRequests.map((request) => ({
        project_id: targetProjectId,
        organization_id: resolvedOrganizationId,
        requested_by: user.id,
        category_name: request.categoryName,
        note: request.note || null,
        status: "pending" as const,
      }));

      const { error } = await supabase.from("category_requests").insert(requestRows);
      if (error) {
        setToast(t("projects.form.errors.categoryRequestsSend"));
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    router.push(`/projects/${targetProjectId}?${mode === "create" ? "created=1" : "updated=1"}`);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 5) {
      goToStep(step + 1);
      return;
    }
    await saveProject();
  };

  return (
    <section className="space-y-6">
      {toast ? (
        <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
          {toast}
        </div>
      ) : null}

      <StepIndicator steps={steps} currentStep={step} />

      <form onSubmit={onSubmit} className="rounded-xl border border-snap-border bg-snap-surface p-6 md:p-8">
        {step === 1 ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("projects.form.basicInformation")}</h2>
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("projects.form.projectNameRequired")}</label>
              <input
                value={formState.name}
                maxLength={80}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              <p className="text-xs text-snap-textDim">{formState.name.length} / 80</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("common.description")}</label>
              <textarea
                value={formState.description}
                maxLength={300}
                rows={4}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              <p className="text-xs text-snap-textDim">{formState.description.length} / 300</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("projects.form.periodConfiguration")}</h2>
            {periodTypeChangedWithInvoices ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                {t("projects.form.periodTypeWarning")}
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, periodType: option }))}
                  className={[
                    "rounded-lg border p-4 text-left transition",
                    formState.periodType === option
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-snap-border bg-snap-bg hover:bg-snap-card",
                  ].join(" ")}
                >
                  <p className="text-sm font-medium text-snap-textMain">{t(`dashboard.charts.${option.toLowerCase()}`)}</p>
                </button>
              ))}
            </div>

            {formState.periodType === "Custom" ? (
              <div className="space-y-4 rounded-lg border border-snap-border bg-snap-bg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-snap-textDim">
                    {t("projects.form.customPeriodsCount", { count: formState.customPeriods.length })}
                  </p>
                  <button
                    type="button"
                    onClick={addCustomPeriod}
                    disabled={formState.customPeriods.length >= 24}
                    className="rounded-md border border-snap-border px-3 py-1.5 text-sm text-snap-textMain disabled:opacity-50"
                  >
                    {t("projects.form.addPeriod")}
                  </button>
                </div>
                {formState.customPeriods.map((period) => (
                  <div key={period.id} className="grid gap-3 rounded-md border border-snap-border p-3 md:grid-cols-4">
                    <input
                      value={period.name}
                      onChange={(event) => updateCustomPeriod(period.id, "name", event.target.value)}
                      placeholder={t("projects.form.periodName")}
                      className="rounded-md border border-snap-border bg-snap-surface px-2 py-1.5 text-sm text-snap-textMain outline-none md:col-span-2"
                    />
                    <input
                      type="date"
                      value={period.startDate}
                      onChange={(event) =>
                        updateCustomPeriod(period.id, "startDate", event.target.value)
                      }
                      className="rounded-md border border-snap-border bg-snap-surface px-2 py-1.5 text-sm text-snap-textMain outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={period.endDate}
                        onChange={(event) =>
                          updateCustomPeriod(period.id, "endDate", event.target.value)
                        }
                        className="w-full rounded-md border border-snap-border bg-snap-surface px-2 py-1.5 text-sm text-snap-textMain outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomPeriod(period.id)}
                        className="rounded-md border border-snap-border px-2 text-xs text-snap-textDim"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("projects.form.selectColumns")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {sortedColumns.map((column) => {
                const checked = formState.selectedColumns.includes(column);
                const isCustom = column === "custom1" || column === "custom2" || column === "custom3";
                return (
                  <div key={column} className="rounded-md border border-snap-border bg-snap-bg p-3">
                    <label className="flex items-center gap-2 text-sm text-snap-textMain">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(column)}
                        className="h-4 w-4 rounded border border-snap-border bg-snap-surface"
                      />
                      {getColumnLabel(column)}
                    </label>
                    {checked && isCustom ? (
                      <input
                        value={formState.customColumnLabels[column]}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            customColumnLabels: {
                              ...prev.customColumnLabels,
                              [column]: event.target.value,
                            },
                          }))
                        }
                        placeholder={PROJECT_COLUMN_LABELS[column]}
                        className="mt-2 w-full rounded-md border border-snap-border bg-snap-surface px-2 py-1.5 text-sm text-snap-textMain outline-none"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("categories.title")}</h2>
            <p className="text-sm text-snap-textDim">{formState.categories.length} / {CATEGORY_LIMIT}</p>
            <div className="flex gap-2">
              <input
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
                placeholder={t("projects.form.addCategoryPlaceholder")}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={normalizeCategory(categoryInput).length === 0}
                className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain disabled:opacity-50"
              >
                {t("common.add")}
              </button>
            </div>
            {formState.categories.length >= CATEGORY_LIMIT ? (
              <p className="text-sm text-snap-textDim">{t("categories.limitReached")}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {formState.categories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-2 rounded-full border border-snap-border bg-snap-bg px-3 py-1 text-xs text-snap-textMain"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        categories: prev.categories.filter((value) => value !== category),
                      }))
                    }
                    className="text-snap-textDim hover:text-snap-textMain"
                    aria-label={t("common.delete")}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("projects.form.review")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-md border border-snap-border bg-snap-bg p-4">
                <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("projects.form.basicInfo")}</p>
                <p className="mt-2 text-sm text-snap-textMain">{formState.name}</p>
                <p className="mt-1 text-sm text-snap-textDim">{formState.description || t("projects.form.noDescription")}</p>
              </article>
              <article className="rounded-md border border-snap-border bg-snap-bg p-4">
                <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("projects.form.period")}</p>
                <p className="mt-2 text-sm text-snap-textMain">{t(`dashboard.charts.${formState.periodType.toLowerCase()}`)}</p>
                {formState.periodType === "Custom" ? (
                  <p className="mt-1 text-sm text-snap-textDim">
                    {t("projects.form.customPeriodsSelected", { count: formState.customPeriods.length })}
                  </p>
                ) : null}
              </article>
              <article className="rounded-md border border-snap-border bg-snap-bg p-4">
                <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("projects.form.columns")}</p>
                <p className="mt-2 text-sm text-snap-textMain">{t("projects.form.columnsSelected", { count: formState.selectedColumns.length })}</p>
              </article>
              <article className="rounded-md border border-snap-border bg-snap-bg p-4">
                <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("categories.title")}</p>
                <p className="mt-2 text-sm text-snap-textMain">{t("projects.form.categoriesAdded", { count: formState.categories.length })}</p>
              </article>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-snap-border pt-5">
          <button
            type="button"
            onClick={goBackStep}
            disabled={step === 1 || isSaving}
            className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain disabled:opacity-50"
          >
            {t("common.back")}
          </button>
          <button
            type="submit"
            disabled={
              isSaving ||
              (step === 1 && !canContinueFromStep1) ||
              (step === 3 && !canContinueFromStep3) ||
              (step === 4 && !canContinueFromStep4)
            }
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain disabled:opacity-50"
          >
            {step === 5
              ? isSaving
                ? t("settings.saving")
                : mode === "create"
                  ? t("projects.form.createProject")
                  : t("projects.form.saveProject")
              : t("common.next")}
          </button>
        </div>
      </form>

      <CategoryRequestModal
        open={requestModalOpen}
        categoryName={requestCategoryName}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={submitCategoryRequest}
      />
    </section>
  );
}
