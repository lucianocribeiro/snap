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
  const body = (await request.json().catch(() => null)) as {
    newAdminEmail?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  const newAdminEmail = body?.newAdminEmail?.trim().toLowerCase();
  const firstName = body?.firstName?.trim() ?? "";
  const lastName = body?.lastName?.trim() ?? "";

  if (!newAdminEmail) {
    return NextResponse.json({ error: "New admin email is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 });
  }

  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  // Find current org admin(s) to downgrade later
  const { data: currentAdmins } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("organization_id", id)
    .eq("role", "org_admin");

  // Check if new admin email already exists in user_profiles
  const { data: existingUser } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("email", newAdminEmail)
    .maybeSingle();

  if (existingUser) {
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ organization_id: id, role: "org_admin" })
      .eq("id", existingUser.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  } else {
    // Invite the user as org_admin via auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      newAdminEmail,
      {
        data: {
          role: "org_admin",
          organization_id: id,
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
        },
      },
    );

    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        { error: inviteError?.message ?? "Failed to invite user." },
        { status: 400 },
      );
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        id: inviteData.user.id,
        email: newAdminEmail,
        role: "org_admin",
        organization_id: id,
        status: "active",
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  // Downgrade previous org_admin(s) to 'user' (skip the newly assigned admin)
  if (currentAdmins && currentAdmins.length > 0) {
    const idsToDowngrade = currentAdmins
      .filter((a) => a.email !== newAdminEmail)
      .map((a) => a.id as string);

    if (idsToDowngrade.length > 0) {
      await supabase.from("user_profiles").update({ role: "user" }).in("id", idsToDowngrade);
    }
  }

  return NextResponse.json({ success: true });
}
