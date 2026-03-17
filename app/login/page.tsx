"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string, t: (key: string) => string) {
  if (!value.trim()) return t("auth.errors.emailRequired");
  if (!emailPattern.test(value)) return t("auth.errors.emailInvalid");
  return "";
}

function validatePassword(value: string, t: (key: string) => string) {
  if (!value) return t("auth.errors.passwordRequired");
  if (value.length < 8) return t("auth.errors.passwordMinLength");
  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const errors: LoginErrors = useMemo(
    () => ({
      email: validateEmail(email, t),
      password: validatePassword(password, t),
    }),
    [email, password, t],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setToastMessage(t("auth.passwordUpdated"));
    }
  }, [t]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setToastMessage(null);

    if (errors.email || errors.password) return;

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setToastMessage(t("auth.invalidCredentials"));
      setIsSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role === "super_admin") {
      router.replace("/super-admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-snap-bg p-4">
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain">
          {toastMessage}
        </div>
      ) : null}
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="Snap logo"
            width={280}
            height={78}
            className="h-[4.2rem] w-auto"
            priority
          />
        </div>
        <AuthCard
          title={t("auth.signIn")}
          description={t("auth.signInDescription")}
          footer={
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-snap-textDim">{t("nav.language")}</span>
              <div className="inline-flex rounded-md border border-snap-border bg-snap-bg p-1">
                {(["en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => void setLanguage(lang)}
                    className={[
                      "rounded px-3 py-1 text-sm",
                      language === lang
                        ? "bg-snap-card text-snap-textMain"
                        : "text-snap-textDim hover:text-snap-textMain",
                    ].join(" ")}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-snap-textDim">
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            />
            {touched.email && errors.email ? (
              <p className="text-xs text-snap-textDim">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-snap-textDim">
              {t("auth.password")}
            </label>
            <div className="flex items-center rounded-md border border-snap-border bg-snap-bg pr-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                className="w-full bg-transparent px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs text-snap-textDim hover:text-snap-textMain"
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
            {touched.password && errors.password ? (
              <p className="text-xs text-snap-textDim">{errors.password}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-snap-textDim">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border border-snap-border bg-snap-bg"
              />
              {t("auth.rememberMe")}
            </label>
            <Link href="/forgot-password" className="text-sm text-snap-textMain underline">
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
          >
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>
          </form>
        </AuthCard>
      </div>
    </main>
  );
}
