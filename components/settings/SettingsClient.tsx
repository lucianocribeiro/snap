"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type TabKey = "organization" | "profile" | "preferences";
type LanguageOption = "en" | "es";

function cx(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(" ");
}

export function SettingsClient() {
  const supabase = useMemo(() => createClient(), []);
  const { userRole, organizationId } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [organizationSubmitting, setOrganizationSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);

  const showOrgTab = userRole === "org_admin" || (userRole === "super_admin" && !!organizationId);
  const visibleTabs = showOrgTab
    ? [
        { key: "organization" as const, label: t("settings.organization") },
        { key: "profile" as const, label: t("settings.profile") },
        { key: "preferences" as const, label: t("settings.preferences") },
      ]
    : [
        { key: "profile" as const, label: t("settings.profile") },
        { key: "preferences" as const, label: t("settings.preferences") },
      ];

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!showOrgTab && activeTab === "organization") {
      setActiveTab("profile");
    }
  }, [activeTab, showOrgTab]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(t("settings.sessionExpired"));
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, language")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(t("settings.failedLoadProfile"));
        setLoading(false);
        return;
      }

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setEmail(profile?.email ?? user.email ?? "");

      if (showOrgTab && organizationId) {
        const { data: organization, error: organizationError } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", organizationId)
          .maybeSingle();

        if (organizationError) {
          setError(t("settings.failedLoadOrganization"));
        } else {
          setOrganizationName(organization?.name ?? "");
          setLogoUrl((organization?.logo_url as string | null | undefined) ?? null);
        }
      }

      setLoading(false);
    };

    void loadSettings();
  }, [showOrgTab, organizationId, supabase, t]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError(t("settings.logoInvalidType"));
      return;
    }
    if (file.size > 1024 * 1024) {
      setLogoError(t("settings.logoFileTooLarge"));
      return;
    }
    if (!organizationId) {
      setError(t("users.orgNotFound"));
      return;
    }

    setLogoUploading(true);
    const path = `${organizationId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setLogoError(uploadError.message);
      setLogoUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("org-logos").getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: publicUrl })
      .eq("id", organizationId);

    if (updateError) {
      setLogoError(updateError.message);
      setLogoUploading(false);
      return;
    }

    setLogoUrl(publicUrl);
    setLogoUploading(false);
    setToast(t("settings.logoUpdated"));
    event.target.value = "";
  };

  const saveOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId) {
      setError(t("users.orgNotFound"));
      return;
    }

    setOrganizationSubmitting(true);
    setError(null);

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({ name: organizationName.trim() })
      .eq("id", organizationId);

    if (organizationError) {
      setError(t("settings.failedSaveOrganization"));
      setOrganizationSubmitting(false);
      return;
    }

    setOrganizationSubmitting(false);
    setToast(t("settings.organizationUpdated"));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t("settings.sessionExpired"));
      setProfileSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      .eq("id", user.id);

    if (profileError) {
      setError(t("settings.failedSaveProfile"));
      setProfileSubmitting(false);
      return;
    }

    setProfileSubmitting(false);
    setToast(t("settings.profileUpdated"));
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMismatch(null);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordMismatch(t("auth.errors.passwordsMustMatch"));
      return;
    }

    setPasswordSubmitting(true);

    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });

    if (passwordError) {
      setError(passwordError.message);
      setPasswordSubmitting(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordSubmitting(false);
    setToast(t("auth.passwordUpdated"));
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreferencesSubmitting(true);
    setError(null);
    await setLanguage(language as LanguageOption);
    setPreferencesSubmitting(false);
    setToast(t("settings.preferencesUpdated"));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-snap-border bg-snap-surface p-2">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cx(
                "rounded-md px-4 py-2 text-sm font-medium transition",
                activeTab === tab.key
                  ? "bg-snap-card text-snap-textMain"
                  : "text-snap-textDim hover:bg-snap-bg hover:text-snap-textMain",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "organization" && showOrgTab ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">{t("settings.organization")}</h2>
          <form onSubmit={saveOrganization} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("settings.organizationName")}</label>
              <input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="w-full max-w-xl rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={organizationSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {organizationSubmitting ? t("settings.saving") : t("common.save")}
            </button>
          </form>

          {userRole === "org_admin" ? (
            <div className="mt-8 border-t border-snap-border pt-6">
              <h3 className="text-base font-semibold text-snap-textMain">{t("settings.logoTitle")}</h3>
              <div className="mt-4 space-y-3">
                <div>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={t("settings.logoTitle")}
                      style={{ height: 48, objectFit: "contain" }}
                      className="rounded"
                    />
                  ) : (
                    <p className="text-sm text-snap-textDim">{t("settings.noLogo")}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="text-sm text-snap-textDim file:mr-3 file:rounded-md file:border file:border-snap-border file:bg-snap-card file:px-3 file:py-1 file:text-sm file:text-snap-textMain file:hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  <p className="text-xs text-snap-textDim">{t("settings.logoHelper")}</p>
                  {logoError ? (
                    <p className="text-xs text-red-300">{logoError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">{t("settings.profile")}</h2>

          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">{t("users.firstName")}</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">{t("users.lastName")}</label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textDim outline-none"
              />
              <p className="text-xs text-snap-textDim">
                {t("settings.emailChangeRequiresAuthFlow")}
              </p>
            </div>

            <button
              type="submit"
              disabled={profileSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {profileSubmitting ? t("settings.saving") : t("settings.saveProfile")}
            </button>
          </form>

          <div className="mt-8 border-t border-snap-border pt-6">
            <h3 className="text-base font-semibold text-snap-textMain">{t("settings.changePassword")}</h3>
            <form onSubmit={updatePassword} className="mt-4 max-w-lg space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">{t("settings.currentPassword")}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">{t("auth.newPassword")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">{t("auth.confirmNewPassword")}</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  minLength={8}
                  required
                />
                {passwordMismatch ? <p className="text-xs text-red-300">{passwordMismatch}</p> : null}
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {passwordSubmitting ? t("settings.updating") : t("settings.updatePassword")}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "preferences" ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">{t("settings.preferences")}</h2>
          <form onSubmit={savePreferences} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">{t("settings.languagePreference")}</label>
              <select
                value={language}
                onChange={(event) => void setLanguage(event.target.value as LanguageOption)}
                className="w-full max-w-sm rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              >
                <option value="en">{t("settings.english")}</option>
                <option value="es">{t("settings.spanish")}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={preferencesSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {preferencesSubmitting ? t("settings.saving") : t("settings.savePreferences")}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
