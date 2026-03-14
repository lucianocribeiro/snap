"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";

type SuperAdminLayoutShellProps = {
  pageTitle?: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/super-admin/dashboard", label: "Dashboard" },
  { href: "/super-admin/organizations", label: "Organizations" },
  { href: "/super-admin/users", label: "Users" },
  { href: "/super-admin/settings", label: "Settings" },
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { signOut } = useAuth();

  return (
    <nav className="mt-4 space-y-1">
      {navItems.map((item) => {
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
      <button
        type="button"
        onClick={() => void signOut()}
        className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
      >
        Logout
      </button>
    </nav>
  );
}

function ContextSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const { activeContext, hasDualAccess, organizationName, switchContext } = useAuth();
  const [open, setOpen] = useState(false);

  if (!hasDualAccess) return null;

  const currentLabel =
    activeContext === "super_admin" ? "Super Admin" : `${organizationName ?? "Organization"} (Admin)`;
  const nextContext = activeContext === "super_admin" ? "org_admin" : "super_admin";
  const nextLabel =
    nextContext === "super_admin"
      ? "Switch to: Super Admin"
      : `Switch to: ${organizationName ?? "Organization"} (Admin)`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain hover:bg-snap-bgDeep"
      >
        <span>{currentLabel}</span>
        <ChevronDown className="h-4 w-4 text-snap-textDim" />
      </button>
      {open ? (
        <div className="mt-2 rounded-md border border-snap-border bg-snap-bg p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              switchContext(nextContext);
              onSwitch?.();
            }}
            className="w-full rounded-md px-2 py-2 text-left text-sm text-snap-textDim hover:bg-snap-bgDeep hover:text-snap-textMain"
          >
            {nextLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SuperAdminLayoutShell({ pageTitle, children }: SuperAdminLayoutShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("snap.superAdminSidebarCollapsed");
    if (storedValue === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("snap.superAdminSidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-snap-bgDeep text-snap-textMain md:flex">
      {!sidebarCollapsed ? (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-snap-border bg-snap-bgSecondary md:flex">
          <div className="flex h-16 items-center border-b border-snap-border px-5">
            <Image src="/logo.png" alt="Snap logo" width={168} height={45} className="h-[2.8rem] w-auto" priority />
          </div>
          <div className="px-3 py-4">
            <ContextSwitcher />
            <SidebarNav pathname={pathname} />
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
              <h1 className="text-xl font-semibold text-snap-textMain">{pageTitle ?? "Super Admin"}</h1>
            </div>
          </div>

          {menuOpen ? (
            <div className="border-t border-snap-border bg-snap-bgSecondary px-3 py-3 md:hidden">
              <ContextSwitcher onSwitch={() => setMenuOpen(false)} />
              <SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
          ) : null}
        </header>

        <main className="flex-1 bg-snap-bgDeep p-6 pt-8 md:p-8 md:pt-10">{children}</main>
      </div>
    </div>
  );
}
