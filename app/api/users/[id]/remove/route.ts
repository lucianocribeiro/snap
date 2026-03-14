import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const caller = await getCurrentUserProfile();

  if (!caller || caller.role !== "org_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  if (caller.id === id) {
    return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: targetUser, error: targetError } = await supabase
    .from("user_profiles")
    .select("id, organization_id, status")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 400 });
  }

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!caller.organizationId || targetUser.organization_id !== caller.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (targetUser.status !== "inactive") {
    return NextResponse.json({ error: "User must be inactive before removal." }, { status: 400 });
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id);

  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
  }

  const { error: deleteProfileError } = await supabase.from("user_profiles").delete().eq("id", id);

  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
