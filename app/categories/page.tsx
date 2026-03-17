"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type CategoryRow = {
  id: string;
  name: string;
  project_id: string;
  created_by: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
};

type InvoiceRow = {
  id: string;
  category_id: string | null;
};

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type CategoryRequestRow = {
  id: string;
  project_id: string;
  category_name: string;
  requested_by: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
};

type CategoryView = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  invoicesCount: number;
  createdBy: string;
  createdAt: string;
};

function formatUserName(user: UserRow | undefined) {
  if (!user) return "-";
  const fullName = [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean).join(" ");
  return fullName || user.email || "-";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function CategoriesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { organizationId, userRole } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CategoryRequestRow[]>([]);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryView | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (userRole === null) return;

    if (userRole !== "org_admin" || !organizationId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      const [categoriesResult, projectsResult, usersResult, invoicesResult, requestsResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, project_id, created_by, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name").eq("organization_id", organizationId),
        supabase
          .from("user_profiles")
          .select("id, first_name, last_name, email")
          .eq("organization_id", organizationId),
        supabase.from("invoices").select("id, category_id").eq("organization_id", organizationId),
        supabase
          .from("category_requests")
          .select("id, project_id, category_name, requested_by, created_at, status, note")
          .eq("organization_id", organizationId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      if (
        categoriesResult.error ||
        projectsResult.error ||
        usersResult.error ||
        invoicesResult.error ||
        requestsResult.error
      ) {
        setToast(t("categories.failedLoadCategories"));
        setCategories([]);
        setProjects([]);
        setUsers([]);
        setInvoices([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      setCategories((categoriesResult.data as CategoryRow[] | null) ?? []);
      setProjects((projectsResult.data as ProjectRow[] | null) ?? []);
      setUsers((usersResult.data as UserRow[] | null) ?? []);
      setInvoices((invoicesResult.data as InvoiceRow[] | null) ?? []);
      setPendingRequests((requestsResult.data as CategoryRequestRow[] | null) ?? []);
      setLoading(false);
    };

    void loadData();
  }, [organizationId, supabase, userRole]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const invoicesCountByCategoryId = useMemo(() => {
    const counts = new Map<string, number>();
    invoices.forEach((invoice) => {
      if (!invoice.category_id) return;
      counts.set(invoice.category_id, (counts.get(invoice.category_id) ?? 0) + 1);
    });
    return counts;
  }, [invoices]);

  const categoryViews: CategoryView[] = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        projectId: category.project_id,
        projectName: projectNameById.get(category.project_id) ?? "-",
        invoicesCount: invoicesCountByCategoryId.get(category.id) ?? 0,
        createdBy: formatUserName(userById.get(category.created_by ?? "")),
        createdAt: category.created_at,
      })),
    [categories, invoicesCountByCategoryId, projectNameById, userById],
  );

  const saveCategoryName = async (row: CategoryView) => {
    const normalizedName = editName.trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      setToast(t("categories.categoryNameRequired"));
      return;
    }

    if (normalizedName === row.name) {
      setEditingCategoryId(null);
      return;
    }

    setBusyKey(`edit-${row.id}`);

    const updateCategory = await supabase.from("categories").update({ name: normalizedName }).eq("id", row.id);
    if (updateCategory.error) {
      setToast(t("categories.failedUpdateCategory"));
      setBusyKey(null);
      return;
    }

    await supabase
      .from("invoices")
      .update({ last_edited_at: new Date().toISOString() })
      .eq("project_id", row.projectId)
      .eq("category_id", row.id);

    setCategories((previous) =>
      previous.map((category) =>
        category.id === row.id
          ? {
              ...category,
              name: normalizedName,
            }
          : category,
      ),
    );

    setEditingCategoryId(null);
    setBusyKey(null);
    setToast(t("categories.updated"));
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;

    setBusyKey(`delete-${categoryToDelete.id}`);

    if (categoryToDelete.invoicesCount > 0) {
      await supabase
        .from("invoices")
        .update({ category_id: null, last_edited_at: new Date().toISOString() })
        .eq("category_id", categoryToDelete.id);
    }

    const { error } = await supabase.from("categories").delete().eq("id", categoryToDelete.id);
    if (error) {
      setToast(t("categories.failedDeleteCategory"));
      setBusyKey(null);
      return;
    }

    setCategories((previous) => previous.filter((category) => category.id !== categoryToDelete.id));
    setCategoryToDelete(null);
    setBusyKey(null);
    setToast(t("categories.deleted"));
  };

  const approveRequest = async (request: CategoryRequestRow) => {
    if (!organizationId) return;

    setBusyKey(`approve-${request.id}`);

    const { data: insertedCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        project_id: request.project_id,
        organization_id: organizationId,
        name: request.category_name,
        created_by: request.requested_by,
      })
      .select("id, name, project_id, created_by, created_at")
      .single();

    if (insertError || !insertedCategory) {
      setToast(t("categories.failedApproveRequest"));
      setBusyKey(null);
      return;
    }

    const { error: statusError } = await supabase
      .from("category_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (statusError) {
      setToast(t("categories.requestApprovedStatusFailed"));
      setBusyKey(null);
      return;
    }

    setCategories((previous) => [insertedCategory as CategoryRow, ...previous]);
    setPendingRequests((previous) => previous.filter((item) => item.id !== request.id));
    setBusyKey(null);
    setToast(t("categories.requestApproved"));
  };

  const rejectRequest = async (request: CategoryRequestRow) => {
    setBusyKey(`reject-${request.id}`);

    const { error } = await supabase
      .from("category_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);

    if (error) {
      setToast(t("categories.failedRejectRequest"));
      setBusyKey(null);
      return;
    }

    setPendingRequests((previous) => previous.filter((item) => item.id !== request.id));
    setBusyKey(null);
    setToast(t("categories.requestRejected"));
  };

  const deleteDescription = categoryToDelete
    ? categoryToDelete.invoicesCount > 0
      ? t("categories.deleteCategoryDescriptionWithInvoices", { count: categoryToDelete.invoicesCount })
      : t("categories.deleteCategoryDescriptionSimple")
    : "";

  return (
    <DashboardLayout pageTitle={t("categories.title")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        <PageHeader title={t("categories.title")} />

        {loading || userRole === null ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("categories.loadingCategories")}
          </div>
        ) : userRole !== "org_admin" ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("categories.onlyAdmins")}
          </div>
        ) : categoryViews.length === 0 ? (
          <EmptyState title={t("categories.emptyTitle")} description={t("categories.emptyDescription")} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-snap-border bg-snap-surface">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-snap-border bg-snap-bg/30 text-xs uppercase tracking-wide text-snap-textDim">
                    <th className="px-4 py-3 font-medium">{t("categories.categoryName")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.project")}</th>
                    <th className="px-4 py-3 font-medium">{t("categories.invoicesUsing")}</th>
                    <th className="px-4 py-3 font-medium">{t("categories.createdBy")}</th>
                    <th className="px-4 py-3 font-medium">{t("categories.createdDate")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryViews.map((row) => {
                    const isEditing = editingCategoryId === row.id;
                    const isBusy = busyKey === `edit-${row.id}` || busyKey === `delete-${row.id}`;

                    return (
                      <tr key={row.id} className="border-b border-snap-border/70 text-sm text-snap-textMain last:border-b-0">
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              className="w-full rounded-md border border-snap-border bg-snap-bg px-2 py-1.5 text-sm text-snap-textMain outline-none"
                            />
                          ) : (
                            row.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-snap-textDim">{row.projectName}</td>
                        <td className="px-4 py-3 text-snap-textDim">{row.invoicesCount}</td>
                        <td className="px-4 py-3 text-snap-textDim">{row.createdBy}</td>
                        <td className="px-4 py-3 text-snap-textDim">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2 text-sm">
                              <button
                                type="button"
                                onClick={() => void saveCategoryName(row)}
                                disabled={isBusy}
                                className="text-snap-accent hover:underline disabled:opacity-50"
                              >
                                {t("common.save")}
                              </button>
                              <span className="text-snap-textDim">·</span>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                disabled={isBusy}
                                className="text-snap-textDim hover:text-snap-textMain disabled:opacity-50"
                              >
                                {t("common.cancel")}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(row.id);
                                  setEditName(row.name);
                                }}
                                className="text-snap-accent hover:underline"
                              >
                                {t("common.edit")}
                              </button>
                              <span className="text-snap-textDim">·</span>
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(row)}
                                className="text-red-300 hover:text-red-200"
                              >
                                {t("common.delete")}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {userRole === "org_admin" && !loading ? (
          <section className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-5">
            <h2 className="text-lg font-semibold text-snap-textMain">{t("categories.categoryRequests")}</h2>

            {pendingRequests.length === 0 ? (
              <div className="rounded-md border border-dashed border-snap-border bg-snap-bg/40 px-4 py-3 text-sm text-snap-textDim">
                {t("categories.noPendingRequests")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-snap-border bg-snap-bg/30 text-xs uppercase tracking-wide text-snap-textDim">
                      <th className="px-4 py-3 font-medium">{t("categories.projectName")}</th>
                      <th className="px-4 py-3 font-medium">{t("categories.requestedCategoryName")}</th>
                      <th className="px-4 py-3 font-medium">{t("categories.requestingUser")}</th>
                      <th className="px-4 py-3 font-medium">{t("categories.dateRequested")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((request) => {
                      const requestUser = formatUserName(userById.get(request.requested_by ?? ""));
                      const approveBusy = busyKey === `approve-${request.id}`;
                      const rejectBusy = busyKey === `reject-${request.id}`;

                      return (
                        <tr key={request.id} className="border-b border-snap-border/70 text-sm text-snap-textMain last:border-b-0">
                          <td className="px-4 py-3 text-snap-textDim">{projectNameById.get(request.project_id) ?? "-"}</td>
                          <td className="px-4 py-3">{request.category_name}</td>
                          <td className="px-4 py-3 text-snap-textDim">{requestUser}</td>
                          <td className="px-4 py-3 text-snap-textDim">{formatDate(request.created_at)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={t("status.pending")} variant="project" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm">
                              <button
                                type="button"
                                onClick={() => void approveRequest(request)}
                                disabled={approveBusy || rejectBusy}
                                className="text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                              >
                                {t("categories.approve")}
                              </button>
                              <span className="text-snap-textDim">·</span>
                              <button
                                type="button"
                                onClick={() => void rejectRequest(request)}
                                disabled={approveBusy || rejectBusy}
                                className="text-red-300 hover:text-red-200 disabled:opacity-50"
                              >
                                {t("categories.reject")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(categoryToDelete)}
        title={t("categories.deleteCategory")}
        description={deleteDescription}
        confirmLabel={busyKey?.startsWith("delete-") ? t("superAdmin.deleting") : t("common.delete")}
        destructive
        onCancel={() => {
          if (busyKey?.startsWith("delete-")) return;
          setCategoryToDelete(null);
        }}
        onConfirm={() => {
          if (busyKey?.startsWith("delete-")) return;
          void deleteCategory();
        }}
      />
    </DashboardLayout>
  );
}
