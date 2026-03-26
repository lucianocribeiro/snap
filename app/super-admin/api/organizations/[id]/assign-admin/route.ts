import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserSuperAdmin } from "@/lib/super-admin/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RequestBody = {
  action: "add" | "replace" | "remove";
  newAdminEmail?: string;
  existingAdminId?: string;
  firstName?: string;
  lastName?: string;
};

async function promoteUser(
  supabase: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  email: string,
  firstName: string,
  lastName: string,
) {
  const { data: existingUser } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    const { error } = await supabase
      .from("user_profiles")
      .update({ organization_id: organizationId, role: "org_admin" })
      .eq("id", existingUser.id);
    return error ?? null;
  }

  // Invite new user
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        role: "org_admin",
        organization_id: organizationId,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
      redirectTo: "https://snap-sand-xi.vercel.app/reset-password",
    },
  );

  if (inviteError || !inviteData.user) {
    return new Error(inviteError?.message ?? "Failed to invite user.");
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      id: inviteData.user.id,
      email,
      role: "org_admin",
      organization_id: organizationId,
      status: "active",
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
    },
    { onConflict: "id" },
  );

  return profileError ?? null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const allowed = await isCurrentUserSuperAdmin();
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body?.action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 });
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

  // ── ADD ──────────────────────────────────────────────────────────────────
  if (body.action === "add") {
    const email = body.newAdminEmail?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "newAdminEmail is required." }, { status: 400 });
    }

    const err = await promoteUser(
      supabase,
      id,
      email,
      body.firstName?.trim() ?? "",
      body.lastName?.trim() ?? "",
    );

    if (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // ── REPLACE ──────────────────────────────────────────────────────────────
  if (body.action === "replace") {
    const existingAdminId = body.existingAdminId?.trim();
    const email = body.newAdminEmail?.trim().toLowerCase();

    if (!existingAdminId) {
      return NextResponse.json({ error: "existingAdminId is required." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "newAdminEmail is required." }, { status: 400 });
    }

    // Confirm the existing admin belongs to this org
    const { data: existingAdmin } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", existingAdminId)
      .eq("organization_id", id)
      .eq("role", "org_admin")
      .maybeSingle();

    if (!existingAdmin) {
      return NextResponse.json({ error: "Existing admin not found in this organization." }, { status: 404 });
    }

    // Promote the new admin first
    const promoteErr = await promoteUser(supabase, id, email, "", "");
    if (promoteErr) {
      return NextResponse.json({ error: promoteErr.message }, { status: 400 });
    }

    // Downgrade the replaced admin (skip if same user was just promoted)
    const { data: newAdminProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!newAdminProfile || newAdminProfile.id !== existingAdminId) {
      const { error: downgradeErr } = await supabase
        .from("user_profiles")
        .update({ role: "user" })
        .eq("id", existingAdminId);

      if (downgradeErr) {
        return NextResponse.json({ error: downgradeErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  }

  // ── REMOVE ───────────────────────────────────────────────────────────────
  if (body.action === "remove") {
    const existingAdminId = body.existingAdminId?.trim();

    if (!existingAdminId) {
      return NextResponse.json({ error: "existingAdminId is required." }, { status: 400 });
    }

    // Count remaining admins for this org
    const { count } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", id)
      .eq("role", "org_admin");

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "An organization must have at least one admin." },
        { status: 400 },
      );
    }

    const { error: downgradeErr } = await supabase
      .from("user_profiles")
      .update({ role: "user" })
      .eq("id", existingAdminId)
      .eq("organization_id", id)
      .eq("role", "org_admin");

    if (downgradeErr) {
      return NextResponse.json({ error: downgradeErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
