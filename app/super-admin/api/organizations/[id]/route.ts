import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserSuperAdmin } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const allowed = await isCurrentUserSuperAdmin();
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: string; status?: string } | null;

  const payload: { name?: string; status?: "active" | "inactive" } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }
    payload.name = name;
  }

  if (body?.status === "active" || body?.status === "inactive") {
    payload.status = body.status;
  }

  if (!payload.name && !payload.status) {
    return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("organizations").update(payload).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
