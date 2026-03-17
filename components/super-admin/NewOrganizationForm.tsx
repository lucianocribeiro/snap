"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function NewOrganizationForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { t } = useLanguage();
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      organizationName: organizationName.trim(),
      adminFirstName: firstName.trim(),
      adminLastName: lastName.trim(),
      adminEmail: email.trim().toLowerCase(),
    };

    if (!payload.organizationName || !payload.adminFirstName || !payload.adminLastName || !payload.adminEmail) {
      setError(t("users.allFieldsRequired"));
      return;
    }

    if (!isValidEmail(payload.adminEmail)) {
      setError(t("auth.errors.emailInvalid"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: invokeError } = await supabase.functions.invoke("create-organization", {
      body: payload,
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (invokeError) {
      setError(invokeError.message || t("superAdmin.failedCreateOrganization"));
      setSubmitting(false);
      return;
    }

    router.push("/super-admin/organizations?created=1");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-snap-border bg-snap-surface p-6">
      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">{t("settings.organizationName")}</label>
        <input
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("superAdmin.adminFirstName")}</label>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-snap-textDim">{t("superAdmin.adminLastName")}</label>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-snap-textDim">{t("superAdmin.adminEmail")}</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          required
        />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex items-center gap-3 border-t border-snap-border pt-5">
        <button
          type="button"
          onClick={() => router.push("/super-admin/organizations")}
          className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? t("superAdmin.creating") : t("superAdmin.createOrganization")}
        </button>
      </div>
    </form>
  );
}
