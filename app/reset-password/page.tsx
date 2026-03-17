"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type ResetErrors = {
  password?: string;
  confirmPassword?: string;
};

function validatePassword(value: string, t: (key: string) => string) {
  if (!value) return t("auth.errors.newPasswordRequired");
  if (value.length < 8) return t("auth.errors.passwordMinLength");
  return "";
}

function getStrengthLevel(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
}

function getStrengthLabel(score: number, t: (key: string) => string) {
  if (score <= 1) return t("auth.weak");
  if (score === 2) return t("auth.medium");
  return t("auth.strong");
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ password: boolean; confirmPassword: boolean }>({
    password: false,
    confirmPassword: false,
  });

  const strength = useMemo(() => getStrengthLevel(password), [password]);

  const errors: ResetErrors = useMemo(() => {
    const passwordError = validatePassword(password, t);
    let confirmPasswordError = "";
    if (!confirmPassword) confirmPasswordError = t("auth.errors.confirmPasswordRequired");
    else if (confirmPassword !== password) confirmPasswordError = t("auth.errors.passwordsMustMatch");

    return { password: passwordError, confirmPassword: confirmPasswordError };
  }, [password, confirmPassword, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (errors.password || errors.confirmPassword) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) return;

    router.replace("/login?reset=success");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-snap-bg p-4">
      <AuthCard
        title={t("auth.resetPassword")}
        description={t("auth.resetPasswordDescription")}
      >
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-snap-textDim">
              {t("auth.newPassword")}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-snap-textDim">{t("auth.passwordStrength")}</span>
              <span className="text-xs text-snap-textDim">{password ? getStrengthLabel(strength, t) : "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((segment) => (
                <div
                  key={segment}
                  className={[
                    "h-2 rounded border border-snap-border",
                    strength >= segment ? "bg-snap-textMain" : "bg-snap-bg",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm text-snap-textDim">
              {t("auth.confirmNewPassword")}
            </label>
            <div className="flex items-center rounded-md border border-snap-border bg-snap-bg pr-2">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                className="w-full bg-transparent px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-xs text-snap-textDim hover:text-snap-textMain"
              >
                {showConfirmPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword ? (
              <p className="text-xs text-snap-textDim">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
          >
            {isSubmitting ? t("auth.resetting") : t("auth.resetPasswordCta")}
          </button>

          <Link href="/login" className="block text-sm text-snap-textMain underline">
            {t("auth.backToLogin")}
          </Link>
        </form>
      </AuthCard>
    </main>
  );
}
