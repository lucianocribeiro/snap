"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationListItem } from "@/lib/super-admin/data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type EditOrganizationFormProps = {
  organization: OrganizationListItem;
};

export function EditOrganizationForm({ organization }: EditOrganizationFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState(organization.name);
  const [status, setStatus] = useState<"active" | "inactive">(organization.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  const assignAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;

    setAdminSubmitting(true);
    setAdminError(null);
    setAdminSuccess(null);

    const response = await fetch(`/super-admin/api/organizations/${organization.id}/assign-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newAdminEmail: email }),
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setAdminError(result.error ?? "Failed to assign admin.");
      setAdminSubmitting(false);
      return;
    }

    setAdminSubmitting(false);
    setNewAdminEmail("");
    setAdminSuccess("Admin assigned successfully.");
    router.refresh();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError(t("superAdmin.organizationNameRequired"));
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
      setError(result.error ?? t("superAdmin.failedUpdateOrganization"));
      setSubmitting(false);
      return;
    }

    router.push(`/super-admin/organizations/${organization.id}?updated=1`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-snap-border bg-snap-surface p-6">
      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">{t("settings.organizationName")}</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">{t("common.status")}</label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "active" | "inactive")}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
        >
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex items-center gap-3 border-t border-snap-border pt-5">
        <button
          type="button"
          onClick={() => router.push(`/super-admin/organizations/${organization.id}`)}
          className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? t("settings.saving") : t("users.saveChanges")}
        </button>
      </div>
    </form>

    <div className="rounded-xl border border-snap-border bg-snap-surface p-6">
      <h3 className="mb-4 text-base font-semibold text-snap-textMain">Admin Management</h3>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.adminName")}</p>
        <p className="mt-1 text-sm text-snap-textMain">{organization.adminName}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.adminEmail")}</p>
        <p className="mt-1 text-sm text-snap-textMain">{organization.adminEmail}</p>
      </div>

      <form onSubmit={(e) => void assignAdmin(e)} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-2" style={{ minWidth: "220px" }}>
          <label className="text-sm text-snap-textDim">New Admin Email</label>
          <input
            type="email"
            value={newAdminEmail}
            onChange={(event) => setNewAdminEmail(event.target.value)}
            placeholder="admin@example.com"
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={adminSubmitting}
          className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {adminSubmitting ? "Assigning..." : "Assign Admin"}
        </button>
      </form>

      {adminError ? <p className="mt-3 text-sm text-red-300">{adminError}</p> : null}
      {adminSuccess ? <p className="mt-3 text-sm text-green-300">{adminSuccess}</p> : null}
    </div>
    </div>
  );
}
