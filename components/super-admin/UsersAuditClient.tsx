"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { UsersAuditItem } from "@/lib/super-admin/data";

type UsersAuditClientProps = {
  users: UsersAuditItem[];
};

function formatRole(role: string) {
  return role === "org_admin" ? "Admin" : "User";
}

function formatLastLogin(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UsersAuditClient({ users }: UsersAuditClientProps) {
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
        title="Users"
        description="Audit-only view of all users across organizations."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={organizationFilter}
          onChange={(event) => setOrganizationFilter(event.target.value)}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">All organizations</option>
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
          <option value="all">All roles</option>
          <option value="org_admin">Admin</option>
          <option value="user">User</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try changing your organization, role, or status filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-snap-border bg-snap-surface">
          <table className="min-w-full divide-y divide-snap-border text-sm">
            <thead>
              <tr className="text-left text-snap-textDim">
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Organization</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-snap-border/70">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3 text-snap-textMain">{user.name}</td>
                  <td className="px-3 py-3 text-snap-textDim">{user.email}</td>
                  <td className="px-3 py-3 text-snap-textDim">{user.organizationName}</td>
                  <td className="px-3 py-3 text-snap-textDim">{formatRole(user.role)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      variant="user"
                      status={user.status === "active" ? "Active" : "Inactive"}
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
