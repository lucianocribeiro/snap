"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createClient } from "@/lib/supabase/client";

type DashboardLayoutProps = {
  pageTitle: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  labelKey: string;
};

const roleNavItems: Record<"super_admin" | "org_admin" | "user", NavItem[]> = {
  org_admin: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/projects", labelKey: "nav.projects" },
    { href: "/invoices", labelKey: "nav.invoices" },
    { href: "/reports", labelKey: "nav.reports" },
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
  const { t } = useLanguage();

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
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function ContextSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const { activeContext, hasDualAccess, organizationName, switchContext } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!hasDualAccess) return null;

  const currentLabel =
    activeContext === "super_admin"
      ? t("nav.superAdmin")
      : `${organizationName ?? t("common.organization")} (${t("common.admin")})`;
  const nextContext = activeContext === "super_admin" ? "org_admin" : "super_admin";
  const nextLabel =
    nextContext === "super_admin"
      ? `${t("common.switchTo")} ${t("nav.superAdmin")}`
      : `${t("common.switchTo")} ${organizationName ?? t("common.organization")} (${t("common.admin")})`;

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

export function DashboardLayout({ pageTitle, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, userRole, activeContext, firstName, lastName, signOut, organizationId, organizationName } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgLogoVisible, setOrgLogoVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const effectiveRole = useMemo(() => {
    if (!userRole) return null;
    if (userRole === "super_admin" && activeContext === "org_admin") {
      return "org_admin" as const;
    }
    return userRole;
  }, [activeContext, userRole]);

  const visibleItems = useMemo(() => (effectiveRole ? roleNavItems[effectiveRole] : []), [effectiveRole]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("snap.sidebarCollapsed");
    if (storedValue === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("snap.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };

    void fetchUnread();
    const interval = setInterval(() => void fetchUnread(), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!organizationId || (userRole === "super_admin" && activeContext === "super_admin")) {
      setOrgLogoUrl(null);
      return;
    }
    const fetchLogo = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", organizationId)
        .maybeSingle();
      setOrgLogoUrl((data?.logo_url as string | null | undefined) ?? null);
      setOrgLogoVisible(true);
    };
    void fetchLogo();
  }, [organizationId, userRole, activeContext, supabase]);

  const showOrgBranding =
    !(userRole === "super_admin" && activeContext === "super_admin") && Boolean(organizationId);

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
            <ContextSwitcher />
            <SidebarNav items={visibleItems} pathname={pathname} />
          </div>
        </aside>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="relative sticky top-0 z-30 h-16 border-b border-snap-border bg-snap-bgDeep">
          <div className="flex h-full items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-md p-2 text-snap-textDim hover:bg-snap-bgSecondary hover:text-snap-textMain md:hidden"
                aria-label={t("common.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="hidden rounded-md p-2 text-snap-textDim hover:bg-snap-bgSecondary hover:text-snap-textMain md:inline-flex"
                aria-label={sidebarCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-snap-textMain">{pageTitle}</h1>
            </div>

            {showOrgBranding ? (
              <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
                {orgLogoUrl && orgLogoVisible ? (
                  <img
                    src={orgLogoUrl}
                    alt={organizationName ?? ""}
                    style={{ height: 63, objectFit: "contain" }}
                    onError={() => setOrgLogoVisible(false)}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <span className="text-sm text-snap-textDim">
                {firstName && lastName ? `${firstName} ${lastName}` : (user?.email ?? "")}
              </span>
              <div className="relative">
                <Link
                  href="/inbox"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-snap-border bg-snap-bg text-snap-textDim hover:bg-snap-bgSecondary hover:text-snap-textMain"
                  aria-label={t("nav.inbox")}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </div>
              <div className="inline-flex rounded-md border border-snap-border bg-snap-bg p-1">
                {(["en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => void setLanguage(lang)}
                    className={[
                      "rounded px-2 py-1 text-xs uppercase",
                      language === lang
                        ? "bg-snap-card text-snap-textMain"
                        : "text-snap-textDim hover:text-snap-textMain",
                    ].join(" ")}
                    aria-label={`${t("nav.language")} ${lang.toUpperCase()}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-snap-border bg-snap-bgSecondary text-xs font-semibold text-snap-textMain hover:border-snap-accent"
                aria-label={t("common.openUserMenu")}
              >
                {initialsFromEmail(user?.email)}
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 top-11 w-44 overflow-hidden rounded-md border border-snap-border bg-snap-bgSecondary shadow-lg">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-sm text-snap-textDim transition hover:bg-snap-bgDeep hover:text-snap-textMain"
                  >
                    {t("nav.settings")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      void signOut();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              ) : null}
              </div>
            </div>
          </div>

          {menuOpen ? (
            <div className="border-t border-snap-border bg-snap-bgSecondary px-3 py-3 md:hidden">
              <ContextSwitcher onSwitch={() => setMenuOpen(false)} />
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
