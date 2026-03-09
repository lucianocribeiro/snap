"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  if (!value.trim()) return "Email is required.";
  if (!emailPattern.test(value)) return "Enter a valid email address.";
  return "";
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = useMemo(() => validateEmail(email), [email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (emailError) return;

    setIsSubmitting(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-snap-bg p-4">
      <AuthCard
        title="Forgot Password"
        description="Enter your account email and we will send reset instructions."
      >
        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-snap-border bg-snap-bg p-6">
              <p className="text-sm text-snap-textMain">
                If an account exists for <span className="font-medium">{email}</span>, a reset
                link has been sent.
              </p>
            </div>
            <Link href="/login" className="block text-sm text-snap-textMain underline">
              Back to login
            </Link>
          </div>
        ) : (
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
                onBlur={() => setTouched(true)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
              />
              {touched && emailError ? <p className="text-xs text-snap-textDim">{emailError}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>

            <Link href="/login" className="block text-sm text-snap-textMain underline">
              Back to login
            </Link>
          </form>
        )}
      </AuthCard>
    </main>
  );
}
