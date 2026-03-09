"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type UserRole = "super_admin" | "org_admin" | "user" | null;

type AuthContextValue = {
  user: User | null;
  userRole: UserRole;
  organizationId: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("user_profiles")
        .select("role, organization_id")
        .eq("id", userId)
        .maybeSingle();

      setUserRole((data?.role as UserRole) ?? null);
      setOrganizationId(data?.organization_id ?? null);
    },
    [supabase],
  );

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
        return;
      }

      void loadProfile(sessionUser.id);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setOrganizationId(null);
    router.push("/login");
  }, [router, supabase]);

  const value = useMemo(
    () => ({
      user,
      userRole,
      organizationId,
      signOut,
    }),
    [organizationId, signOut, user, userRole],
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
