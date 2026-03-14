import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserSuperAdmin } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const allowed = await isCurrentUserSuperAdmin();
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { nextStatus?: string } | null;
  const nextStatus = body?.nextStatus === "inactive" ? "inactive" : "active";

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("organizations").update({ status: nextStatus }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
