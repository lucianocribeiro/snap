import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_CONTEXT_COOKIE } from "@/lib/auth/constants";
import {
  getDashboardPathForRole,
  getRequiredRoles,
  isOrgRoute,
  isPublicRoute,
  updateSession,
} from "@/lib/supabase/middleware";

function copySupabaseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });

  return target;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await updateSession(request);

  if (isPublicRoute(pathname)) {
    return session.response;
  }

  if (!session.isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return copySupabaseCookies(session.response, NextResponse.redirect(loginUrl));
  }

  const requiredRoles = getRequiredRoles(pathname);
  const activeContext = request.cookies.get(ACTIVE_CONTEXT_COOKIE)?.value;
  const superAdminInOrgContext =
    session.role === "super_admin" &&
    Boolean(session.organizationId) &&
    activeContext === "org_admin";

  if (
    requiredRoles &&
    (!session.role ||
      (!requiredRoles.includes(session.role) &&
        !(superAdminInOrgContext && isOrgRoute(pathname))))
  ) {
    const fallbackUrl = new URL(getDashboardPathForRole(session.role), request.url);
    return copySupabaseCookies(session.response, NextResponse.redirect(fallbackUrl));
  }

  return session.response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
