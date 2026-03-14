// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";

type CreateOrganizationRequest = {
  organizationName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(message: string, status = 400) {
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
    return respond("Method not allowed", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return respond("Missing Supabase environment variables.", 500);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return respond("Unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return respond("Unauthorized", 401);
    }

    const body = (await request.json()) as Partial<CreateOrganizationRequest>;
    const organizationName = body.organizationName?.trim() ?? "";
    const adminFirstName = body.adminFirstName?.trim() ?? "";
    const adminLastName = body.adminLastName?.trim() ?? "";
    const adminEmail = body.adminEmail?.trim().toLowerCase() ?? "";

    if (!organizationName || !adminFirstName || !adminLastName || !adminEmail) {
      return respond("Missing required fields.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: callerUser },
      error: callerAuthError,
    } = await supabase.auth.getUser(token);

    if (callerAuthError || !callerUser) {
      return respond("Unauthorized", 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile || callerProfile.role !== "super_admin") {
      return respond("Forbidden", 403);
    }

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      return respond(usersError.message, 500);
    }

    const existingAuthUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === adminEmail,
    );

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        status: "active",
      })
      .select("id")
      .single();

    if (organizationError || !organization) {
      return respond(organizationError?.message ?? "Failed to create organization.", 400);
    }

    const organizationId = organization.id;

    let adminUserId = existingAuthUser?.id;

    if (!adminUserId) {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(adminEmail, {
        data: {
          first_name: adminFirstName,
          last_name: adminLastName,
          role: "org_admin",
          organization_id: organizationId,
        },
      });

      if (inviteError || !inviteData.user) {
        await supabase.from("organizations").delete().eq("id", organizationId);
        return respond(inviteError?.message ?? "Failed to invite organization admin.", 400);
      }

      adminUserId = inviteData.user.id;
    }

    const { error: profileUpsertError } = await supabase.from("user_profiles").upsert(
      {
        id: adminUserId,
        first_name: adminFirstName,
        last_name: adminLastName,
        email: adminEmail,
        role: "org_admin",
        organization_id: organizationId,
        status: "active",
      },
      { onConflict: "id" },
    );

    if (profileUpsertError) {
      await supabase.from("organizations").delete().eq("id", organizationId);
      return respond(profileUpsertError.message, 500);
    }

    return new Response(JSON.stringify({ success: true, organizationId }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond(message, 500);
  }
});
