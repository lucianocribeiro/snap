"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type TabKey = "organization" | "profile" | "preferences";
type LanguageOption = "en" | "es";

function cx(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(" ");
}

export function SettingsClient() {
  const supabase = useMemo(() => createClient(), []);
  const { userRole, organizationId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<LanguageOption>("en");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState<string | null>(null);

  const [organizationSubmitting, setOrganizationSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);

  const isOrgAdmin = userRole === "org_admin";
  const visibleTabs = isOrgAdmin
    ? [
        { key: "organization" as const, label: "Organization" },
        { key: "profile" as const, label: "Profile" },
        { key: "preferences" as const, label: "Preferences" },
      ]
    : [
        { key: "profile" as const, label: "Profile" },
        { key: "preferences" as const, label: "Preferences" },
      ];

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!isOrgAdmin && activeTab === "organization") {
      setActiveTab("profile");
    }
  }, [activeTab, isOrgAdmin]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, language")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("Failed to load profile settings.");
        setLoading(false);
        return;
      }

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setEmail(profile?.email ?? user.email ?? "");
      setLanguage(profile?.language === "es" ? "es" : "en");

      if (isOrgAdmin && organizationId) {
        const { data: organization, error: organizationError } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", organizationId)
          .maybeSingle();

        if (organizationError) {
          setError("Failed to load organization settings.");
        } else {
          setOrganizationName(organization?.name ?? "");
        }
      }

      setLoading(false);
    };

    void loadSettings();
  }, [isOrgAdmin, organizationId, supabase]);

  const saveOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId) {
      setError("Organization not found for your account.");
      return;
    }

    setOrganizationSubmitting(true);
    setError(null);

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({ name: organizationName.trim() })
      .eq("id", organizationId);

    if (organizationError) {
      setError("Failed to save organization settings.");
      setOrganizationSubmitting(false);
      return;
    }

    setOrganizationSubmitting(false);
    setToast("Organization updated.");
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please sign in again.");
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
      setError("Failed to save profile.");
      setProfileSubmitting(false);
      return;
    }

    setProfileSubmitting(false);
    setToast("Profile updated.");
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMismatch(null);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordMismatch("New password and confirmation do not match.");
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
    setToast("Password updated.");
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreferencesSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please sign in again.");
      setPreferencesSubmitting(false);
      return;
    }

    const { error: preferencesError } = await supabase
      .from("user_profiles")
      .update({ language })
      .eq("id", user.id);

    if (preferencesError) {
      setError("Failed to save language preference.");
      setPreferencesSubmitting(false);
      return;
    }

    setPreferencesSubmitting(false);
    setToast("Preferences updated.");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
        Loading settings...
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

      {activeTab === "organization" && isOrgAdmin ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">Organization</h2>
          <form onSubmit={saveOrganization} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">Organization name</label>
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
              {organizationSubmitting ? "Saving..." : "Save"}
            </button>
          </form>
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">Profile</h2>

          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">First name</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">Last name</label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textDim outline-none"
              />
              <p className="text-xs text-snap-textDim">
                Email changes require the Supabase authentication flow.
              </p>
            </div>

            <button
              type="submit"
              disabled={profileSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {profileSubmitting ? "Saving..." : "Save profile"}
            </button>
          </form>

          <div className="mt-8 border-t border-snap-border pt-6">
            <h3 className="text-base font-semibold text-snap-textMain">Change password</h3>
            <form onSubmit={updatePassword} className="mt-4 max-w-lg space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">New password</label>
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
                <label className="text-sm text-snap-textDim">Confirm new password</label>
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
                {passwordSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "preferences" ? (
        <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
          <h2 className="text-lg font-semibold text-snap-textMain">Preferences</h2>
          <form onSubmit={savePreferences} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-snap-textDim">Language preference</label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as LanguageOption)}
                className="w-full max-w-sm rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
              </select>
              <p className="text-xs text-snap-textDim">
                Full translations will be available in a future update.
              </p>
            </div>

            <button
              type="submit"
              disabled={preferencesSubmitting}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {preferencesSubmitting ? "Saving..." : "Save preferences"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
