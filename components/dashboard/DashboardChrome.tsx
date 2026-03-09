"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

type NavItem = {
  href: string;
  label: string;
};

const baseItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/invoices", label: "Invoices" },
];

const orgAdminItems: NavItem[] = [
  { href: "/users", label: "Users" },
  { href: "/categories", label: "Categories" },
];

const superAdminItems: NavItem[] = [{ href: "/super-admin/dashboard", label: "Super Admin" }];

export function DashboardChrome() {
  const { user, userRole, signOut } = useAuth();

  const items = [
    ...baseItems,
    ...(userRole === "org_admin" || userRole === "super_admin" ? orgAdminItems : []),
    ...(userRole === "super_admin" ? superAdminItems : []),
  ];

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-snap-border bg-snap-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-snap-textDim">Navigation</p>
        <nav className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 text-sm text-snap-textMain hover:bg-snap-bg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-snap-border bg-snap-card p-4">
        <div>
          <p className="text-sm text-snap-textMain">{user?.email ?? "No active user"}</p>
          <p className="text-xs uppercase tracking-wide text-snap-textDim">
            Role: {userRole ?? "unknown"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded border border-snap-border px-3 py-1.5 text-sm text-snap-textMain hover:bg-snap-bg"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
