"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/context/AuthContext";
import type { OrganizationListItem } from "@/lib/super-admin/data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type OrganizationsListClientProps = {
  organizations: OrganizationListItem[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function OrganizationsListClient({ organizations }: OrganizationsListClientProps) {
  const { organizationId } = useAuth();
  const { t } = useLanguage();
  const [orgList, setOrgList] = useState<OrganizationListItem[]>(organizations);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrganizationListItem | null>(null);
  const [deleteSelected, setDeleteSelected] = useState<OrganizationListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      setToast(t("superAdmin.organizationCreated"));
    } else if (params.get("deleted") === "1") {
      setToast(t("superAdmin.organizationDeleted"));
    }
  }, [t]);

  const filtered = useMemo(() => {
    return orgList.filter((organization) => {
      const byStatus = status === "all" ? true : organization.status === status;
      const bySearch =
        organization.name.toLowerCase().includes(search.toLowerCase()) ||
        organization.adminName.toLowerCase().includes(search.toLowerCase()) ||
        organization.adminEmail.toLowerCase().includes(search.toLowerCase());

      return byStatus && bySearch;
    });
  }, [orgList, search, status]);

  const toggleStatus = async () => {
    if (!selected) return;

    const nextStatus = selected.status === "active" ? "inactive" : "active";
    setSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${selected.id}/toggle-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus }),
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setToast(result.error ?? t("superAdmin.failedUpdateOrganization"));
      setSubmitting(false);
      return;
    }

    setOrgList((prev) => prev.map((org) => org.id === selected.id ? { ...org, status: nextStatus } : org));
    setSubmitting(false);
    setSelected(null);
    setToast(nextStatus === "active" ? t("superAdmin.organizationActivated") : t("superAdmin.organizationDeactivated"));
  };

  const deleteOrganization = async () => {
    if (!deleteSelected) return;
    setDeleteSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${deleteSelected.id}/delete`, {
      method: "DELETE",
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setToast(result.error ?? t("superAdmin.failedDeleteOrganization"));
      setDeleteSubmitting(false);
      return;
    }

    setOrgList((prev) => prev.filter((org) => org.id !== deleteSelected.id));
    setDeleteSubmitting(false);
    setDeleteSelected(null);
    setToast(t("superAdmin.organizationDeleted"));
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("nav.organizations")}
        action={
          <Link
            href="/super-admin/organizations/new"
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            {t("superAdmin.newOrganizationWithPlus")}
          </Link>
        }
      />

      {toast ? (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("superAdmin.searchOrganizations")}
          className="w-full rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">{t("projects.statusAll")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("superAdmin.noOrganizationsFound")}
          description={t("superAdmin.noOrganizationsFilterHint")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-snap-border bg-snap-surface">
          <table className="min-w-full divide-y divide-snap-border text-sm">
            <thead>
              <tr className="text-left text-snap-textDim">
                <th className="px-3 py-3 font-medium">{t("common.organization")}</th>
                <th className="px-3 py-3 font-medium">{t("superAdmin.adminName")}</th>
                <th className="px-3 py-3 font-medium">{t("superAdmin.adminEmail")}</th>
                <th className="px-3 py-3 font-medium">{t("superAdmin.users")}</th>
                <th className="px-3 py-3 font-medium">{t("nav.projects")}</th>
                <th className="px-3 py-3 font-medium">{t("superAdmin.dateCreated")}</th>
                <th className="px-3 py-3 font-medium">{t("common.status")}</th>
                <th className="px-3 py-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-snap-border/70">
              {filtered.map((organization) => (
                <tr key={organization.id}>
                  <td className="px-3 py-3 text-snap-textMain">{organization.name}</td>
                  <td className="px-3 py-3 text-snap-textDim">{organization.adminName}</td>
                  <td className="px-3 py-3 text-snap-textDim">{organization.adminEmail}</td>
                  <td className="px-3 py-3 text-snap-textDim">{organization.usersCount}</td>
                  <td className="px-3 py-3 text-snap-textDim">{organization.projectsCount}</td>
                  <td className="px-3 py-3 text-snap-textDim">{formatDate(organization.createdAt)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      variant="org"
                      status={organization.status === "active" ? t("status.active") : t("status.inactive")}
                    />
                  </td>
                  <td className="px-3 py-3 text-snap-textDim">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/super-admin/organizations/${organization.id}`}
                        className="hover:text-snap-accent"
                      >
                        {t("common.view")}
                      </Link>
                      <Link
                        href={`/super-admin/organizations/${organization.id}/edit`}
                        className="hover:text-snap-accent"
                      >
                        {t("common.edit")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelected(organization)}
                        className="hover:text-red-300"
                      >
                        {organization.status === "active" ? t("users.deactivate") : t("users.activate")}
                      </button>
                      <button
                        type="button"
                        disabled={organization.status !== "inactive"}
                        onClick={() => setDeleteSelected(organization)}
                        className="text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(selected)}
        title={`${selected?.status === "active" ? t("users.deactivate") : t("users.activate")} ${t("common.organization")}`}
        description={
          selected?.status === "active"
            ? t("superAdmin.deactivateOrgUsersDescription")
            : t("superAdmin.activateOrgUsersDescription")
        }
        confirmLabel={
          submitting
            ? t("settings.saving")
            : selected?.status === "active"
              ? t("users.deactivate")
              : t("users.activate")
        }
        destructive={selected?.status === "active"}
        onCancel={() => (submitting ? null : setSelected(null))}
        onConfirm={() => void toggleStatus()}
      />

      <ConfirmModal
        open={Boolean(deleteSelected)}
        title={t("superAdmin.deleteOrganization")}
        description={t("superAdmin.deleteOrganizationDescription", { name: deleteSelected?.name ?? t("superAdmin.orgName") })}
        confirmLabel={deleteSubmitting ? t("superAdmin.deleting") : t("common.delete")}
        destructive
        onCancel={() => (deleteSubmitting ? null : setDeleteSelected(null))}
        onConfirm={() => void deleteOrganization()}
      />
    </div>
  );
}
