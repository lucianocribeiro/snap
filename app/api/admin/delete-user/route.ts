import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string };
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
  }

  const { error: deleteProfileError } = await supabase.from("user_profiles").delete().eq("id", userId);

  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
