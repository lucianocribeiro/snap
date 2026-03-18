"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminManagementSection } from "@/components/super-admin/AdminManagementSection";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OrganizationListItem } from "@/lib/super-admin/data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type OrganizationDetailClientProps = {
  organization: OrganizationListItem;
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

export function OrganizationDetailClient({ organization }: OrganizationDetailClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("updated") === "1") {
      setToast(t("settings.organizationUpdated"));
    }
  }, [t]);

  const toggleStatus = async () => {
    const nextStatus = organization.status === "active" ? "inactive" : "active";
    setSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${organization.id}/toggle-status`, {
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

    setSubmitting(false);
    setConfirmOpen(false);
    setToast(nextStatus === "active" ? t("superAdmin.organizationActivated") : t("superAdmin.organizationDeactivated"));
    router.refresh();
  };

  const deleteOrganization = async () => {
    setDeleteSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${organization.id}/delete`, {
      method: "DELETE",
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setToast(result.error ?? t("superAdmin.failedDeleteOrganization"));
      setDeleteSubmitting(false);
      return;
    }

    setDeleteSubmitting(false);
    setDeleteConfirmOpen(false);
    router.push("/super-admin/organizations?deleted=1");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {toast ? (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
          {toast}
        </div>
      ) : null}

      <div className="rounded-xl border border-snap-border bg-snap-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-snap-border pb-5">
          <h2 className="text-xl font-semibold text-snap-textMain">{organization.name}</h2>
          <StatusBadge
            variant="org"
            status={organization.status === "active" ? t("status.active") : t("status.inactive")}
          />
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.adminName")}</dt>
            <dd className="mt-1 text-sm text-snap-textMain">{organization.adminName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.adminEmail")}</dt>
            <dd className="mt-1 text-sm text-snap-textMain">{organization.adminEmail}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.dateCreated")}</dt>
            <dd className="mt-1 text-sm text-snap-textMain">{formatDate(organization.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.usersCount")}</dt>
            <dd className="mt-1 text-sm text-snap-textMain">{organization.usersCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.projectsCount")}</dt>
            <dd className="mt-1 text-sm text-snap-textMain">{organization.projectsCount}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-snap-border pt-5">
          <Link
            href={`/super-admin/organizations/${organization.id}/edit`}
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            {t("common.edit")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            {organization.status === "active" ? t("users.deactivate") : t("users.activate")}
          </button>
          <button
            type="button"
            disabled={organization.status !== "inactive"}
            onClick={() => setDeleteConfirmOpen(true)}
            className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <AdminManagementSection organizationId={organization.id} />

      <ConfirmModal
        open={confirmOpen}
        title={`${organization.status === "active" ? t("users.deactivate") : t("users.activate")} ${t("common.organization")}`}
        description={
          organization.status === "active"
            ? t("superAdmin.markedInactive")
            : t("superAdmin.markedActive")
        }
        confirmLabel={submitting ? t("settings.saving") : organization.status === "active" ? t("users.deactivate") : t("users.activate")}
        destructive={organization.status === "active"}
        onCancel={() => (submitting ? null : setConfirmOpen(false))}
        onConfirm={() => void toggleStatus()}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        title={t("superAdmin.deleteOrganization")}
        description={t("superAdmin.deleteOrganizationDescription", { name: organization.name })}
        confirmLabel={deleteSubmitting ? t("superAdmin.deleting") : t("common.delete")}
        destructive
        onCancel={() => (deleteSubmitting ? null : setDeleteConfirmOpen(false))}
        onConfirm={() => void deleteOrganization()}
      />
    </div>
  );
}
