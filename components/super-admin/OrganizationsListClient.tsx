"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/context/AuthContext";
import type { OrganizationListItem } from "@/lib/super-admin/data";

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
  const router = useRouter();
  const { organizationId } = useAuth();
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
      setToast("Organization created successfully.");
    } else if (params.get("deleted") === "1") {
      setToast("Organization deleted successfully.");
    }
  }, []);

  const filtered = useMemo(() => {
    return organizations.filter((organization) => {
      const byStatus = status === "all" ? true : organization.status === status;
      const bySearch =
        organization.name.toLowerCase().includes(search.toLowerCase()) ||
        organization.adminName.toLowerCase().includes(search.toLowerCase()) ||
        organization.adminEmail.toLowerCase().includes(search.toLowerCase());

      return byStatus && bySearch;
    });
  }, [organizations, search, status]);

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
      setToast(result.error ?? "Failed to update organization.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSelected(null);
    setToast(nextStatus === "active" ? "Organization activated." : "Organization deactivated.");
    router.refresh();
  };

  const deleteOrganization = async () => {
    if (!deleteSelected) return;
    setDeleteSubmitting(true);

    const response = await fetch(`/super-admin/api/organizations/${deleteSelected.id}/delete`, {
      method: "DELETE",
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setToast(result.error ?? "Failed to delete organization.");
      setDeleteSubmitting(false);
      return;
    }

    setDeleteSubmitting(false);
    setDeleteSelected(null);
    router.push("/super-admin/organizations?deleted=1");
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Organizations"
        action={
          <Link
            href="/super-admin/organizations/new"
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            + New Organization
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
          placeholder="Search organization, admin, email..."
          className="w-full rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description="Try adjusting your search or status filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-snap-border bg-snap-surface">
          <table className="min-w-full divide-y divide-snap-border text-sm">
            <thead>
              <tr className="text-left text-snap-textDim">
                <th className="px-3 py-3 font-medium">Organization</th>
                <th className="px-3 py-3 font-medium">Admin name</th>
                <th className="px-3 py-3 font-medium">Admin email</th>
                <th className="px-3 py-3 font-medium">Users</th>
                <th className="px-3 py-3 font-medium">Projects</th>
                <th className="px-3 py-3 font-medium">Date created</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
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
                      status={organization.status === "active" ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="px-3 py-3 text-snap-textDim">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/super-admin/organizations/${organization.id}`}
                        className="hover:text-snap-accent"
                      >
                        View
                      </Link>
                      <Link
                        href={`/super-admin/organizations/${organization.id}/edit`}
                        className="hover:text-snap-accent"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelected(organization)}
                        className="hover:text-red-300"
                      >
                        {organization.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={organization.status !== "inactive" || (organizationId === organization.id)}
                        onClick={() => setDeleteSelected(organization)}
                        className="text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
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
        title={`${selected?.status === "active" ? "Deactivate" : "Activate"} Organization`}
        description={
          selected?.status === "active"
            ? "Users in this organization will lose access until reactivated."
            : "Users in this organization will regain access."
        }
        confirmLabel={
          submitting
            ? "Saving..."
            : selected?.status === "active"
              ? "Deactivate"
              : "Activate"
        }
        destructive={selected?.status === "active"}
        onCancel={() => (submitting ? null : setSelected(null))}
        onConfirm={() => void toggleStatus()}
      />

      <ConfirmModal
        open={Boolean(deleteSelected)}
        title="Delete Organization"
        description={`This will permanently delete [${deleteSelected?.name ?? "Org Name"}] and all associated data including users, projects, invoices, and categories. This cannot be undone.`}
        confirmLabel={deleteSubmitting ? "Deleting..." : "Delete"}
        destructive
        onCancel={() => (deleteSubmitting ? null : setDeleteSelected(null))}
        onConfirm={() => void deleteOrganization()}
      />
    </div>
  );
}
