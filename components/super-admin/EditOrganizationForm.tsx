"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationListItem } from "@/lib/super-admin/data";

type EditOrganizationFormProps = {
  organization: OrganizationListItem;
};

export function EditOrganizationForm({ organization }: EditOrganizationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [status, setStatus] = useState<"active" | "inactive">(organization.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch(`/super-admin/api/organizations/${organization.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), status }),
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Failed to update organization.");
      setSubmitting(false);
      return;
    }

    router.push(`/super-admin/organizations/${organization.id}?updated=1`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-snap-border bg-snap-surface p-6">
      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">Organization name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">Status</label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "active" | "inactive")}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex items-center gap-3 border-t border-snap-border pt-5">
        <button
          type="button"
          onClick={() => router.push(`/super-admin/organizations/${organization.id}`)}
          className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
