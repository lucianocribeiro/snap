"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type NavItem = {
  href: string;
  labelKey: string;
};

const roleItems: Record<"super_admin" | "org_admin" | "user", NavItem[]> = {
  org_admin: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/projects", labelKey: "nav.projects" },
    { href: "/invoices", labelKey: "nav.invoices" },
    { href: "/users", labelKey: "nav.users" },
    { href: "/categories", labelKey: "nav.categories" },
    { href: "/settings", labelKey: "nav.settings" },
  ],
  user: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/projects", labelKey: "nav.projects" },
    { href: "/invoices", labelKey: "nav.invoices" },
    { href: "/reports", labelKey: "nav.reports" },
    { href: "/settings", labelKey: "nav.settings" },
  ],
  super_admin: [
    { href: "/super-admin/dashboard", labelKey: "nav.dashboard" },
    { href: "/super-admin/organizations", labelKey: "nav.organizations" },
    { href: "/super-admin/users", labelKey: "nav.users" },
    { href: "/super-admin/settings", labelKey: "nav.settings" },
  ],
};

export function DashboardChrome() {
  const { user, userRole, signOut } = useAuth();
  const { t } = useLanguage();

  const items = userRole ? roleItems[userRole] : [];

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-snap-border bg-snap-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-snap-textDim">{t("common.navigation")}</p>
        <nav className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 text-sm text-snap-textMain hover:bg-snap-bg"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-snap-border bg-snap-card p-4">
        <div>
          <p className="text-sm text-snap-textMain">{user?.email ?? t("common.noActiveUser")}</p>
          <p className="text-xs uppercase tracking-wide text-snap-textDim">
            {t("users.role")}: {userRole ?? t("common.unknown")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded border border-snap-border px-3 py-1.5 text-sm text-snap-textMain hover:bg-snap-bg"
        >
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );
}
