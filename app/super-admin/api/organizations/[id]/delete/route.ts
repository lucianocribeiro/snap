import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const caller = await getCurrentUserProfile();

  if (!caller || caller.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createServiceRoleClient();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 });
  }

  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  if (organization.status !== "inactive") {
    return NextResponse.json({ error: "Organization must be inactive before deletion." }, { status: 400 });
  }

  if (caller.organizationId && caller.organizationId === id) {
    return NextResponse.json({ error: "You cannot delete your own organization." }, { status: 400 });
  }

  const { data: orgUsers, error: usersError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("organization_id", id);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 400 });
  }

  const userIds = (orgUsers ?? []).map((user) => user.id as string);

  if (userIds.includes(caller.id)) {
    return NextResponse.json({ error: "You cannot delete yourself." }, { status: 400 });
  }

  for (const userId of userIds) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
    }
  }

  const { error: deleteProfilesError } = await supabase
    .from("user_profiles")
    .delete()
    .eq("organization_id", id);

  if (deleteProfilesError) {
    return NextResponse.json({ error: deleteProfilesError.message }, { status: 400 });
  }

  const { error: deleteOrgError } = await supabase.from("organizations").delete().eq("id", id);

  if (deleteOrgError) {
    return NextResponse.json({ error: deleteOrgError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
