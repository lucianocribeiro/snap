"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SuperAdminSettingsClient() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<"en" | "es">("en");

  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, language")
        .eq("id", user.id)
        .maybeSingle();

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setEmail(profile?.email ?? user.email ?? "");
      setLanguage(profile?.language === "es" ? "es" : "en");
      setLoading(false);
    };

    void loadProfile();
  }, [supabase]);

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

    const nextEmail = email.trim().toLowerCase();

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: nextEmail,
        language,
      })
      .eq("id", user.id);

    if (profileError) {
      setError("Failed to update profile.");
      setProfileSubmitting(false);
      return;
    }

    if (nextEmail !== (user.email ?? "").toLowerCase()) {
      const { error: authError } = await supabase.auth.updateUser({ email: nextEmail });
      if (authError) {
        setError(authError.message);
        setProfileSubmitting(false);
        return;
      }
    }

    setProfileSubmitting(false);
    setToast("Profile updated.");
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSubmitting(true);
    setError(null);

    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setError(passwordError.message);
      setPasswordSubmitting(false);
      return;
    }

    setPassword("");
    setPasswordSubmitting(false);
    setToast("Password updated.");
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
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

      <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
        <h2 className="text-lg font-semibold text-snap-textMain">Personal profile</h2>
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
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={profileSubmitting}
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {profileSubmitting ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
        <h2 className="text-lg font-semibold text-snap-textMain">Language preference</h2>
        <div className="mt-5 space-y-2">
          <label className="text-sm text-snap-textDim">Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "es")}
            className="w-full max-w-sm rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
        <h2 className="text-lg font-semibold text-snap-textMain">Change password</h2>
        <form onSubmit={changePassword} className="mt-5 flex max-w-sm flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={passwordSubmitting}
            className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {passwordSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
