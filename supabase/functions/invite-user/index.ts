// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";

type InviteUserRequest = {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return badRequest("Method not allowed", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return badRequest("Missing Supabase environment variables.", 500);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return badRequest("Unauthorized", 401);
    }

    const body = (await request.json()) as Partial<InviteUserRequest>;
    const email = body.email?.trim().toLowerCase() ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const organizationId = body.organizationId?.trim() ?? "";

    if (!email || !firstName || !lastName || !organizationId) {
      return badRequest("Missing required fields.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user: callerUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !callerUser) {
      return badRequest("Unauthorized", 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("user_profiles")
      .select("role, organization_id")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      return badRequest("Unable to verify caller profile.", 403);
    }

    if (callerProfile.role !== "org_admin" && callerProfile.role !== "super_admin") {
      return badRequest("Forbidden", 403);
    }

    if (callerProfile.organization_id !== organizationId) {
      return badRequest("Organization mismatch.", 403);
    }

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: "user",
        organization_id: organizationId,
      },
      options: {
        redirectTo: "https://snap-sand-xi.vercel.app/reset-password",
      },
    });

    if (inviteError || !inviteData.user) {
      return badRequest(inviteError?.message ?? "Failed to invite user.", 400);
    }

    const { error: profileUpsertError } = await supabase.from("user_profiles").upsert(
      {
        id: inviteData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: "user",
        organization_id: organizationId,
        status: "active",
      },
      { onConflict: "id" },
    );

    if (profileUpsertError) {
      return badRequest(profileUpsertError.message, 500);
    }

    return new Response(JSON.stringify({ success: true, userId: inviteData.user.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return badRequest(message, 500);
  }
});
