"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OrganizationListItem } from "@/lib/super-admin/data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type RecentOrganizationsTableProps = {
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

export function RecentOrganizationsTable({ organizations }: RecentOrganizationsTableProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrganizationListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const deactivate = async () => {
    if (!selected) return;
    setSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${selected.id}/toggle-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus: "inactive" }),
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setToast(result.error ?? t("superAdmin.failedUpdateOrganization"));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSelected(null);
    setToast(t("superAdmin.organizationDeactivated"));
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-xl border border-snap-border bg-snap-surface p-6">
      {toast ? (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
          {toast}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-snap-border text-sm">
          <thead>
            <tr className="text-left text-snap-textDim">
              <th className="px-3 py-3 font-medium">{t("common.organization")}</th>
              <th className="px-3 py-3 font-medium">{t("superAdmin.adminEmail")}</th>
              <th className="px-3 py-3 font-medium">{t("superAdmin.users")}</th>
              <th className="px-3 py-3 font-medium">{t("superAdmin.dateCreated")}</th>
              <th className="px-3 py-3 font-medium">{t("common.status")}</th>
              <th className="px-3 py-3 font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-snap-border/70">
            {organizations.map((organization) => (
              <tr key={organization.id}>
                <td className="px-3 py-3 text-snap-textMain">{organization.name}</td>
                <td className="px-3 py-3 text-snap-textDim">{organization.adminEmail}</td>
                <td className="px-3 py-3 text-snap-textDim">{organization.usersCount}</td>
                <td className="px-3 py-3 text-snap-textDim">{formatDate(organization.createdAt)}</td>
                <td className="px-3 py-3">
                    <StatusBadge
                      variant="org"
                      status={organization.status === "active" ? t("status.active") : t("status.inactive")}
                    />
                  </td>
                <td className="px-3 py-3 text-snap-textDim">
                  <div className="flex items-center gap-3">
                    <Link href={`/super-admin/organizations/${organization.id}`} className="hover:text-snap-accent">
                      {t("common.view")}
                    </Link>
                    <button
                      type="button"
                      disabled={organization.status === "inactive"}
                      onClick={() => setSelected(organization)}
                      className="hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("users.deactivate")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(selected)}
        title={t("superAdmin.deactivateOrganization")}
        description={t("superAdmin.deactivateOrganizationDescription")}
        confirmLabel={submitting ? t("superAdmin.deactivating") : t("users.deactivate")}
        destructive
        onCancel={() => (submitting ? null : setSelected(null))}
        onConfirm={() => void deactivate()}
      />
    </div>
  );
}
