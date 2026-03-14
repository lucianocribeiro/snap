import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrganizationStatus = "active" | "inactive";
export type UserRole = "super_admin" | "org_admin" | "user";

export type OrganizationRow = {
  id: string;
  name: string;
  status: OrganizationStatus;
  created_at: string;
};

export type UserProfileRow = {
  id: string;
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
  status: OrganizationStatus;
  last_login_at: string | null;
};

export type PlatformSummary = {
  totalOrganizations: number;
  totalActiveUsers: number;
  totalInvoicesProcessed: number;
  newOrganizationsThisMonth: number;
};

export type OrganizationListItem = {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAt: string;
  adminName: string;
  adminEmail: string;
  usersCount: number;
  projectsCount: number;
};

export type UsersAuditItem = {
  id: string;
  name: string;
  email: string;
  organizationId: string | null;
  organizationName: string;
  role: UserRole;
  status: OrganizationStatus;
  lastLoginAt: string | null;
};

function fullName(firstName: string | null, lastName: string | null) {
  const value = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  return value || "-";
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const supabase = createServiceRoleClient();

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [orgCount, activeUsersCount, invoiceCount, newOrgCount] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .not("organization_id", "is", null)
      .eq("status", "active"),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  return {
    totalOrganizations: orgCount.count ?? 0,
    totalActiveUsers: activeUsersCount.count ?? 0,
    totalInvoicesProcessed: invoiceCount.count ?? 0,
    newOrganizationsThisMonth: newOrgCount.count ?? 0,
  };
}

export async function getOrganizationsWithCounts(limit?: number): Promise<OrganizationListItem[]> {
  const supabase = createServiceRoleClient();

  let orgQuery = supabase
    .from("organizations")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });

  if (limit) {
    orgQuery = orgQuery.limit(limit);
  }

  const [{ data: orgRows, error: orgError }, { data: userRows, error: userError }, { data: projectRows, error: projectError }] =
    await Promise.all([
      orgQuery,
      supabase
        .from("user_profiles")
        .select("id, organization_id, first_name, last_name, email, role, status, last_login_at")
        .not("organization_id", "is", null),
      supabase.from("projects").select("id, organization_id"),
    ]);

  if (orgError) throw new Error(orgError.message);
  if (userError) throw new Error(userError.message);
  if (projectError) throw new Error(projectError.message);

  const usersByOrg = new Map<string, UserProfileRow[]>();
  const projectsByOrg = new Map<string, number>();

  ((userRows ?? []) as UserProfileRow[]).forEach((user) => {
    if (!user.organization_id) return;
    const current = usersByOrg.get(user.organization_id) ?? [];
    current.push(user);
    usersByOrg.set(user.organization_id, current);
  });

  (projectRows ?? []).forEach((project) => {
    const organizationId = project.organization_id as string;
    projectsByOrg.set(organizationId, (projectsByOrg.get(organizationId) ?? 0) + 1);
  });

  return ((orgRows ?? []) as OrganizationRow[]).map((organization) => {
    const orgUsers = usersByOrg.get(organization.id) ?? [];
    const admin = orgUsers
      .filter((user) => user.role === "org_admin")
      .sort((a, b) => a.email.localeCompare(b.email))[0];

    return {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      createdAt: organization.created_at,
      adminName: admin ? fullName(admin.first_name, admin.last_name) : "-",
      adminEmail: admin?.email ?? "-",
      usersCount: orgUsers.length,
      projectsCount: projectsByOrg.get(organization.id) ?? 0,
    };
  });
}

export async function getOrganizationById(id: string): Promise<OrganizationListItem | null> {
  const rows = await getOrganizationsWithCounts();
  return rows.find((organization) => organization.id === id) ?? null;
}

export async function getRecentOrganizations(limit = 10): Promise<OrganizationListItem[]> {
  return getOrganizationsWithCounts(limit);
}

export async function getUsersAuditData(): Promise<UsersAuditItem[]> {
  const supabase = createServiceRoleClient();

  const [{ data: users, error: usersError }, { data: organizations, error: organizationsError }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, organization_id, first_name, last_name, email, role, status, last_login_at")
        .not("organization_id", "is", null)
        .neq("role", "super_admin")
        .order("first_name", { ascending: true }),
      supabase.from("organizations").select("id, name"),
    ]);

  if (usersError) throw new Error(usersError.message);
  if (organizationsError) throw new Error(organizationsError.message);

  const organizationsById = new Map<string, string>();
  (organizations ?? []).forEach((organization) => {
    organizationsById.set(organization.id as string, organization.name as string);
  });

  return ((users ?? []) as UserProfileRow[]).map((user) => ({
    id: user.id,
    name: fullName(user.first_name, user.last_name),
    email: user.email,
    organizationId: user.organization_id,
    organizationName: user.organization_id ? organizationsById.get(user.organization_id) ?? "-" : "-",
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at,
  }));
}
