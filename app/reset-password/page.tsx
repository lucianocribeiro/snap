"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

type ResetErrors = {
  password?: string;
  confirmPassword?: string;
};

function validatePassword(value: string) {
  if (!value) return "New password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

function getStrengthLevel(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
}

function getStrengthLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Medium";
  return "Strong";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<{ password: boolean; confirmPassword: boolean }>({
    password: false,
    confirmPassword: false,
  });

  const strength = useMemo(() => getStrengthLevel(password), [password]);

  const errors: ResetErrors = useMemo(() => {
    const passwordError = validatePassword(password);
    let confirmPasswordError = "";
    if (!confirmPassword) confirmPasswordError = "Please confirm your password.";
    else if (confirmPassword !== password) confirmPasswordError = "Passwords must match.";

    return { password: passwordError, confirmPassword: confirmPasswordError };
  }, [password, confirmPassword]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (errors.password || errors.confirmPassword) return;

    console.log("reset_password_submit", { password, confirmPassword });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-snap-bg p-4">
      <AuthCard
        title="Reset Password"
        description="Set a new password for your account."
      >
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-snap-textDim">
              New password
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
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {touched.password && errors.password ? (
              <p className="text-xs text-snap-textDim">{errors.password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-snap-textDim">Password strength</span>
              <span className="text-xs text-snap-textDim">{password ? getStrengthLabel(strength) : "-"}</span>
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
              Confirm new password
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
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword ? (
              <p className="text-xs text-snap-textDim">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
          >
            Reset password
          </button>

          <Link href="/login" className="block text-sm text-snap-textMain underline">
            Back to login
          </Link>
        </form>
      </AuthCard>
    </main>
  );
}
