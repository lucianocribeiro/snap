"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { UsersAuditItem } from "@/lib/super-admin/data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type UsersAuditClientProps = {
  users: UsersAuditItem[];
};

function formatLastLogin(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UsersAuditClient({ users }: UsersAuditClientProps) {
  const { t } = useLanguage();
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "org_admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const organizations = useMemo(() => {
    const values = new Map<string, string>();
    users.forEach((user) => {
      if (user.organizationId && user.organizationName !== "-") {
        values.set(user.organizationId, user.organizationName);
      }
    });
    return Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const byOrganization = organizationFilter === "all" ? true : user.organizationId === organizationFilter;
      const byRole = roleFilter === "all" ? true : user.role === roleFilter;
      const byStatus = statusFilter === "all" ? true : user.status === statusFilter;
      return byOrganization && byRole && byStatus;
    });
  }, [users, organizationFilter, roleFilter, statusFilter]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("users.title")}
        description={t("superAdmin.usersAuditDescription")}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={organizationFilter}
          onChange={(event) => setOrganizationFilter(event.target.value)}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">{t("superAdmin.allOrganizations")}</option>
          {organizations.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as "all" | "org_admin" | "user")}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">{t("superAdmin.allRoles")}</option>
          <option value="org_admin">{t("common.admin")}</option>
          <option value="user">{t("users.user")}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">{t("superAdmin.allStatuses")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("users.noUsersFound")}
          description={t("superAdmin.usersFilterHint")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-snap-border bg-snap-surface">
          <table className="min-w-full divide-y divide-snap-border text-sm">
            <thead>
              <tr className="text-left text-snap-textDim">
                <th className="px-3 py-3 font-medium">{t("common.name")}</th>
                <th className="px-3 py-3 font-medium">{t("auth.email")}</th>
                <th className="px-3 py-3 font-medium">{t("common.organization")}</th>
                <th className="px-3 py-3 font-medium">{t("users.role")}</th>
                <th className="px-3 py-3 font-medium">{t("common.status")}</th>
                <th className="px-3 py-3 font-medium">{t("users.lastLogin")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-snap-border/70">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3 text-snap-textMain">{user.name}</td>
                  <td className="px-3 py-3 text-snap-textDim">{user.email}</td>
                  <td className="px-3 py-3 text-snap-textDim">{user.organizationName}</td>
                  <td className="px-3 py-3 text-snap-textDim">{user.role === "org_admin" ? t("common.admin") : t("users.user")}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      variant="user"
                      status={user.status === "active" ? t("status.active") : t("status.inactive")}
                    />
                  </td>
                  <td className="px-3 py-3 text-snap-textDim">{formatLastLogin(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
