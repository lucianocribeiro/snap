"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  if (!value.trim()) return "Email is required.";
  if (!emailPattern.test(value)) return "Enter a valid email address.";
  return "";
}

function validatePassword(value: string) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ES">("EN");
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const errors: LoginErrors = useMemo(
    () => ({
      email: validateEmail(email),
      password: validatePassword(password),
    }),
    [email, password],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (errors.email || errors.password) return;

    console.log("login_submit", { email, password, rememberMe, language });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-snap-bg p-4">
      <AuthCard
        title="Snap"
        description="Sign in to continue to your organization dashboard."
        footer={
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-snap-textDim">Language</span>
            <div className="inline-flex rounded-md border border-snap-border bg-snap-bg p-1">
              {(["EN", "ES"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={[
                    "rounded px-3 py-1 text-sm",
                    language === lang
                      ? "bg-snap-card text-snap-textMain"
                      : "text-snap-textDim hover:text-snap-textMain",
                  ].join(" ")}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-snap-textDim">
              Email
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
              Password
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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-snap-textDim">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border border-snap-border bg-snap-bg"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm text-snap-textMain underline">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
          >
            Sign In
          </button>
        </form>
      </AuthCard>
    </main>
  );
}
