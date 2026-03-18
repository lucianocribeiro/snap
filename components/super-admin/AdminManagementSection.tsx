"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type AdminRow = { id: string; name: string; email: string };

type Props = { organizationId: string };

export function AdminManagementSection({ organizationId }: Props) {
  const { t } = useLanguage();

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Add Admin
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Replace Admin
  const [replaceFromId, setReplaceFromId] = useState("");
  const [replaceToEmail, setReplaceToEmail] = useState("");
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceSuccess, setReplaceSuccess] = useState<string | null>(null);

  // Remove Admin
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    const res = await fetch(`/super-admin/api/organizations/${organizationId}/admins`);
    if (res.ok) {
      const data = (await res.json()) as { admins: AdminRow[] };
      setAdmins(data.admins);
    }
    setLoadingAdmins(false);
  }, [organizationId]);

  useEffect(() => {
    void fetchAdmins();
  }, [fetchAdmins]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `/super-admin/api/organizations/${organizationId}/assign-admin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: result.error };
  };

  const addAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const email = addEmail.trim().toLowerCase();
    if (!email) return;

    setAddSubmitting(true);
    setAddError(null);
    setAddSuccess(null);

    const { ok, error } = await post({
      action: "add",
      newAdminEmail: email,
      firstName: addFirstName.trim(),
      lastName: addLastName.trim(),
    });

    if (!ok) {
      setAddError(error ?? t("superAdmin.failedUpdateOrganization"));
      setAddSubmitting(false);
      return;
    }

    setAddSubmitting(false);
    setAddEmail("");
    setAddFirstName("");
    setAddLastName("");
    setAddSuccess(t("superAdmin.adminAdded"));
    void fetchAdmins();
  };

  const replaceAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const email = replaceToEmail.trim().toLowerCase();
    if (!email || !replaceFromId) return;

    setReplaceSubmitting(true);
    setReplaceError(null);
    setReplaceSuccess(null);

    const { ok, error } = await post({
      action: "replace",
      existingAdminId: replaceFromId,
      newAdminEmail: email,
    });

    if (!ok) {
      setReplaceError(error ?? t("superAdmin.failedUpdateOrganization"));
      setReplaceSubmitting(false);
      return;
    }

    setReplaceSubmitting(false);
    setReplaceFromId("");
    setReplaceToEmail("");
    setReplaceSuccess(t("superAdmin.adminReplaced"));
    void fetchAdmins();
  };

  const removeAdmin = async (adminId: string) => {
    if (admins.length <= 1) {
      setRemoveError(t("superAdmin.cannotRemoveLastAdmin"));
      return;
    }

    setRemovingId(adminId);
    setRemoveError(null);

    const { ok, error } = await post({ action: "remove", existingAdminId: adminId });

    if (!ok) {
      setRemoveError(error ?? t("superAdmin.failedUpdateOrganization"));
      setRemovingId(null);
      return;
    }

    setAdmins((prev) => prev.filter((a) => a.id !== adminId));
    setRemovingId(null);
  };

  return (
    <div className="rounded-xl border border-snap-border bg-snap-surface p-6 space-y-6">
      <h3 className="text-base font-semibold text-snap-textMain">{t("superAdmin.adminManagement")}</h3>

      {/* Current admins list */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-snap-textDim">{t("superAdmin.currentAdmins")}</p>
        {loadingAdmins ? (
          <p className="text-sm text-snap-textDim">{t("common.loading")}</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-snap-textDim">{t("superAdmin.noAdminsFound")}</p>
        ) : (
          <ul className="divide-y divide-snap-border/60 rounded-md border border-snap-border">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div>
                  <p className="text-sm text-snap-textMain">{admin.name !== "-" ? admin.name : admin.email}</p>
                  {admin.name !== "-" ? (
                    <p className="text-xs text-snap-textDim">{admin.email}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={removingId === admin.id}
                  onClick={() => void removeAdmin(admin.id)}
                  className="shrink-0 text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
                >
                  {removingId === admin.id ? t("superAdmin.removingAdmin") : t("superAdmin.removeAdmin")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {removeError ? <p className="text-sm text-red-300">{removeError}</p> : null}
      </div>

      {/* Add Admin */}
      <div className="space-y-3 border-t border-snap-border pt-5">
        <p className="text-sm font-medium text-snap-textMain">{t("superAdmin.addAdmin")}</p>
        <form onSubmit={(e) => void addAdmin(e)} className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-snap-textDim">{t("superAdmin.newAdminEmail")}</label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("superAdmin.adminFirstName")}</label>
              <input
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("superAdmin.adminLastName")}</label>
              <input
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-snap-textDim">{t("superAdmin.nameOptionalForExisting")}</p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {addSubmitting ? t("superAdmin.addingAdmin") : t("superAdmin.addAdmin")}
            </button>
          </div>
        </form>
        {addError ? <p className="text-sm text-red-300">{addError}</p> : null}
        {addSuccess ? <p className="text-sm text-green-300">{addSuccess}</p> : null}
      </div>

      {/* Replace Admin — only shown when there is at least one admin */}
      {admins.length > 0 ? (
        <div className="space-y-3 border-t border-snap-border pt-5">
          <p className="text-sm font-medium text-snap-textMain">{t("superAdmin.replaceAdmin")}</p>
          <form onSubmit={(e) => void replaceAdmin(e)} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("superAdmin.existingAdminToReplace")}</label>
              <select
                value={replaceFromId}
                onChange={(e) => setReplaceFromId(e.target.value)}
                required
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              >
                <option value="">{t("superAdmin.selectAdmin")}</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name !== "-" ? `${admin.name} (${admin.email})` : admin.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("superAdmin.newAdminEmail")}</label>
              <input
                type="email"
                value={replaceToEmail}
                onChange={(e) => setReplaceToEmail(e.target.value)}
                placeholder="newadmin@example.com"
                required
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={replaceSubmitting}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {replaceSubmitting ? t("superAdmin.replacingAdmin") : t("superAdmin.replaceAdmin")}
              </button>
            </div>
          </form>
          {replaceError ? <p className="text-sm text-red-300">{replaceError}</p> : null}
          {replaceSuccess ? <p className="text-sm text-green-300">{replaceSuccess}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
