import { createClient } from "@/lib/supabase/server";

export type CurrentUserProfile = {
  id: string;
  role: string | null;
  organizationId: string | null;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    role: profile?.role ?? null,
    organizationId: profile?.organization_id ?? null,
  };
}

export async function isCurrentUserSuperAdmin() {
  const profile = await getCurrentUserProfile();
  return profile?.role === "super_admin";
}
