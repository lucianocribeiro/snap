"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OrganizationListItem } from "@/lib/super-admin/data";

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
      setToast(result.error ?? "Failed to update organization.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSelected(null);
    setToast("Organization deactivated.");
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
              <th className="px-3 py-3 font-medium">Organization</th>
              <th className="px-3 py-3 font-medium">Admin email</th>
              <th className="px-3 py-3 font-medium">Users</th>
              <th className="px-3 py-3 font-medium">Date created</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Actions</th>
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
                    status={organization.status === "active" ? "Active" : "Inactive"}
                  />
                </td>
                <td className="px-3 py-3 text-snap-textDim">
                  <div className="flex items-center gap-3">
                    <Link href={`/super-admin/organizations/${organization.id}`} className="hover:text-snap-accent">
                      View
                    </Link>
                    <button
                      type="button"
                      disabled={organization.status === "inactive"}
                      onClick={() => setSelected(organization)}
                      className="hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Deactivate
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
        title="Deactivate Organization"
        description="This will disable organization access until it is activated again."
        confirmLabel={submitting ? "Deactivating..." : "Deactivate"}
        destructive
        onCancel={() => (submitting ? null : setSelected(null))}
        onConfirm={() => void deactivate()}
      />
    </div>
  );
}
