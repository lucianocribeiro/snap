import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserSuperAdmin } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const allowed = await isCurrentUserSuperAdmin();
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name, email")
    .eq("organization_id", id)
    .eq("role", "org_admin")
    .order("email");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const admins = (data ?? []).map((row) => ({
    id: row.id as string,
    name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "-",
    email: row.email as string,
  }));

  return NextResponse.json({ admins });
}
