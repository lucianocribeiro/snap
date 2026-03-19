"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ACTIVE_CONTEXT_COOKIE, type ActiveContext } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";

type UserRole = "super_admin" | "org_admin" | "user" | null;

type AuthContextValue = {
  user: User | null;
  userRole: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  hasDualAccess: boolean;
  activeContext: ActiveContext;
  accessLevel: "edit" | "view_only";
  canEdit: boolean;
  switchContext: (nextContext: ActiveContext) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setActiveContextCookie(value: ActiveContext) {
  document.cookie = `${ACTIVE_CONTEXT_COOKIE}=${value}; path=/; max-age=2592000; samesite=lax`;
}

function clearActiveContextCookie() {
  document.cookie = `${ACTIVE_CONTEXT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function getActiveContextCookie(): ActiveContext | null {
  const match = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ACTIVE_CONTEXT_COOKIE}=`));

  if (!match) return null;
  const value = match.split("=")[1];
  return value === "org_admin" || value === "super_admin" ? value : null;
}

function resolveEffectiveRole(
  role: UserRole,
  context: ActiveContext,
  hasOrganizationLink: boolean,
): UserRole {
  if (role === "super_admin" && hasOrganizationLink && context === "org_admin") {
    return "org_admin";
  }

  return role;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [hasDualAccess, setHasDualAccess] = useState(false);
  const [activeContext, setActiveContext] = useState<ActiveContext>("org_admin");
  const [accessLevel, setAccessLevel] = useState<"edit" | "view_only">("edit");

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("user_profiles")
        .select("role, organization_id, access_level")
        .eq("id", userId)
        .maybeSingle();

      const nextRole = (data?.role as UserRole) ?? null;
      const nextOrganizationId = data?.organization_id ?? null;
      const rawAccessLevel = (data?.access_level as string | null) ?? "edit";
      const nextAccessLevel: "edit" | "view_only" =
        nextRole === "org_admin" || nextRole === "super_admin"
          ? "edit"
          : rawAccessLevel === "view_only"
            ? "view_only"
            : "edit";
      setAccessLevel(nextAccessLevel);

      setOrganizationId(nextOrganizationId);

      if (nextOrganizationId) {
        const { data: organization } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", nextOrganizationId)
          .maybeSingle();
        setOrganizationName((organization?.name as string | undefined) ?? null);
      } else {
        setOrganizationName(null);
      }

      const dualAccess = nextRole === "super_admin" && Boolean(nextOrganizationId);
      setHasDualAccess(dualAccess);

      let nextContext: ActiveContext;
      if (dualAccess) {
        const cookieContext = getActiveContextCookie();
        nextContext = cookieContext === "org_admin" ? "org_admin" : "super_admin";
        setActiveContextCookie(nextContext);
      } else {
        nextContext = nextRole === "super_admin" ? "super_admin" : "org_admin";
        clearActiveContextCookie();
      }

      const effectiveRole = resolveEffectiveRole(nextRole, nextContext, Boolean(nextOrganizationId));
      setUserRole(effectiveRole);
      setActiveContext(nextContext);
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [loadProfile, user]);

  useEffect(() => {
    const bootstrap = async () => {
      const {
        data: { user: initialUser },
      } = await supabase.auth.getUser();

      setUser(initialUser);
      if (initialUser) {
        await loadProfile(initialUser.id);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        setUserRole(null);
        setOrganizationId(null);
        setOrganizationName(null);
        setHasDualAccess(false);
        setActiveContext("org_admin");
        setAccessLevel("edit");
        clearActiveContextCookie();
        return;
      }

      void loadProfile(sessionUser.id);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

  const switchContext = useCallback(
    (nextContext: ActiveContext) => {
      if (!hasDualAccess) return;
      const nextRole = resolveEffectiveRole("super_admin", nextContext, true);
      setUserRole(nextRole);
      setActiveContext(nextContext);
      setActiveContextCookie(nextContext);
      router.push(nextContext === "org_admin" ? "/dashboard" : "/super-admin/dashboard");
    },
    [hasDualAccess, router],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setOrganizationId(null);
    setOrganizationName(null);
    setHasDualAccess(false);
    setActiveContext("org_admin");
    setAccessLevel("edit");
    clearActiveContextCookie();
    router.push("/login");
  }, [router, supabase]);

  const canEdit = accessLevel === "edit";

  const value = useMemo(
    () => ({
      user,
      userRole,
      organizationId,
      organizationName,
      hasDualAccess,
      activeContext,
      accessLevel,
      canEdit,
      switchContext,
      refreshProfile,
      signOut,
    }),
    [accessLevel, activeContext, canEdit, hasDualAccess, organizationId, organizationName, refreshProfile, signOut, switchContext, user, userRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
