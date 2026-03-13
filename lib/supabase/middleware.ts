import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type UserRole = "super_admin" | "org_admin" | "user";

type SessionContext = {
  response: NextResponse;
  isAuthenticated: boolean;
  role: UserRole | null;
};

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getRequiredRoles(pathname: string): UserRole[] | null {
  if (pathname.startsWith("/super-admin")) return ["super_admin"];
  if (pathname === "/users" || pathname.startsWith("/users/")) return ["org_admin"];
  if (pathname === "/categories" || pathname.startsWith("/categories/")) {
    return ["super_admin", "org_admin"];
  }

  return null;
}

export function getDashboardPathForRole(role: UserRole | null) {
  if (role === "super_admin") return "/super-admin/dashboard";
  return "/dashboard";
}

export async function updateSession(request: NextRequest): Promise<SessionContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response, isAuthenticated: false, role: null };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole | undefined) ?? null;

  return { response, isAuthenticated: true, role };
}
