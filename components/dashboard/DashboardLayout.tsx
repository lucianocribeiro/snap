"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";

type DashboardLayoutProps = {
  pageTitle: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const roleNavItems: Record<"super_admin" | "org_admin" | "user", NavItem[]> = {
  org_admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/invoices", label: "Invoices" },
    { href: "/reports", label: "Reports" },
    { href: "/users", label: "Users" },
    { href: "/categories", label: "Categories" },
    { href: "/settings", label: "Settings" },
  ],
  user: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/invoices", label: "Invoices" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ],
  super_admin: [
    { href: "/super-admin/dashboard", label: "Dashboard" },
    { href: "/super-admin/organizations", label: "Organizations" },
    { href: "/super-admin/users", label: "Users" },
    { href: "/super-admin/settings", label: "Settings" },
  ],
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initialsFromEmail(email?: string) {
  if (!email) return "SN";
  const [name] = email.split("@");
  const parts = name.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-4 space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cx(
              "block rounded-md px-3 py-2 text-sm transition",
              "hover:bg-snap-bgDeep hover:text-snap-accent",
              isActive ? "bg-snap-bgDeep text-snap-accent" : "text-snap-textDim",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardLayout({ pageTitle, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, userRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const visibleItems = useMemo(() => (userRole ? roleNavItems[userRole] : []), [userRole]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("snap.sidebarCollapsed");
    if (storedValue === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("snap.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-snap-bgDeep text-snap-textMain md:flex">
      {!sidebarCollapsed ? (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-snap-border bg-snap-bgSecondary md:flex">
          <div className="flex h-16 items-center border-b border-snap-border px-5">
            <Image
              src="/logo.png"
              alt="Snap logo"
              width={168}
              height={45}
              className="h-[2.8rem] w-auto"
              priority
            />
          </div>
          <div className="px-3 py-4">
            <SidebarNav items={visibleItems} pathname={pathname} />
          </div>
        </aside>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-snap-border bg-snap-bgDeep">
          <div className="flex h-full items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-md p-2 text-snap-textDim hover:bg-snap-bgSecondary hover:text-snap-textMain md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="hidden rounded-md p-2 text-snap-textDim hover:bg-snap-bgSecondary hover:text-snap-textMain md:inline-flex"
                aria-label={sidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-snap-textMain">{pageTitle}</h1>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-snap-border bg-snap-bgSecondary text-xs font-semibold text-snap-textMain hover:border-snap-accent"
                aria-label="Open user menu"
              >
                {initialsFromEmail(user?.email)}
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 top-11 w-44 overflow-hidden rounded-md border border-snap-border bg-snap-bgSecondary shadow-lg">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-sm text-snap-textDim transition hover:bg-snap-bgDeep hover:text-snap-textMain"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-sm text-snap-textDim transition hover:bg-snap-bgDeep hover:text-snap-textMain"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      void signOut();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {menuOpen ? (
            <div className="border-t border-snap-border bg-snap-bgSecondary px-3 py-3 md:hidden">
              <SidebarNav
                items={visibleItems}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          ) : null}
        </header>

        <main className="flex-1 bg-snap-bgDeep p-6 pt-8 md:p-8 md:pt-10">{children}</main>
      </div>
    </div>
  );
}
