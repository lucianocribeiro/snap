// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";

type OCRRequestBody = {
  fileUrl: string;
  projectId: string;
  language: "en" | "es";
};

type ExtractedField = {
  key: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

type ColumnMapping = {
  extractedKey: string;
  projectColumn: string | null;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENTITY_KEY_MAP: Record<string, string> = {
  invoice_date: "invoiceDate",
  supplier_name: "vendor",
  total_amount: "totalAmount",
  net_amount: "amount",
  vat_tax_amount: "tax",
  invoice_id: "invoiceNumber",
  due_date: "dueDate",
};

const ENTITY_LABEL_MAP: Record<string, string> = {
  invoiceDate: "Invoice Date",
  vendor: "Vendor",
  totalAmount: "Total Amount",
  amount: "Amount",
  tax: "Tax",
  invoiceNumber: "Invoice #",
  dueDate: "Due Date",
};

function mapConfidence(value = 0): "high" | "medium" | "low" {
  if (value > 0.85) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

function toStoragePath(fileUrl: string) {
  if (!fileUrl) return "";
  if (!fileUrl.includes("http")) return fileUrl.replace(/^\/+/, "");

  const marker = "/storage/v1/object/";
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) return fileUrl;

  const objectPath = fileUrl.slice(markerIndex + marker.length);
  const parts = objectPath.split("/");
  if (parts.length <= 2) return fileUrl;

  // Supports private/public/signed URLs:
  // public/<bucket>/<path> | sign/<bucket>/<path> | authenticated/<bucket>/<path>
  return parts.slice(2).join("/");
}

async function getGoogleAccessToken(credentialsJson: string): Promise<string> {
  const credentials = JSON.parse(credentialsJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemContents = credentials.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 1024;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const credentialsJson = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON");
    const projectId = Deno.env.get("GOOGLE_DOCUMENT_AI_PROJECT_ID");
    const location = Deno.env.get("GOOGLE_DOCUMENT_AI_LOCATION") ?? "us";
    const processorId = Deno.env.get("GOOGLE_DOCUMENT_AI_PROCESSOR_ID");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }
    if (!credentialsJson) {
      throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON.");
    }
    if (!projectId || !location || !processorId) {
      throw new Error(
        "Missing Google Document AI identifiers: GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_LOCATION, or GOOGLE_DOCUMENT_AI_PROCESSOR_ID.",
      );
    }

    const body = (await request.json()) as OCRRequestBody;
    const { fileUrl } = body;
    if (!fileUrl || !body.projectId || !body.language) {
      return new Response(JSON.stringify({ error: "Invalid request body." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    console.log("Step 1: Auth verified, user:", user.id);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = profile?.organization_id;
    console.log("Step 2: Organization ID:", profile?.organization_id);
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organization not found for user." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const storagePath = toStoragePath(fileUrl);
    console.log("Step 3: Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("invoices")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download invoice file: ${downloadError?.message ?? "unknown error"}`);
    }

    console.log("Step 4: Calling Document AI...");
    const accessToken = await getGoogleAccessToken(credentialsJson);
    const fileBuffer = await fileData.arrayBuffer();
    const base64File = uint8ArrayToBase64(new Uint8Array(fileBuffer));
    const docAiUrl =
      `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    const docAiResponse = await fetch(docAiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64File,
          mimeType: fileData.type || "application/pdf",
        },
      }),
    });

    if (!docAiResponse.ok) {
      const errorBody = await docAiResponse.text();
      throw new Error(`Document AI request failed (${docAiResponse.status}): ${errorBody}`);
    }

    const docAiResult = await docAiResponse.json();
    console.log("Step 5: Processing response...");
    const document = docAiResult.document;
    const pages = document?.pages ?? [];
    const entities = document?.entities ?? [];
    const text = document?.text ?? "";
    const pageCount = pages.length;
    const textLength = text.length;
    console.log("Step 5.1: Parsed document primitives:", {
      pageCount,
      entityCount: entities.length,
      textLength,
    });

    const extractedFields: ExtractedField[] = entities
      .map((entity) => {
        const mappedKey = ENTITY_KEY_MAP[entity.type ?? ""];
        if (!mappedKey) return null;

        const value = entity.mentionText ?? "";
        if (!value.trim()) return null;

        return {
          key: mappedKey,
          label: ENTITY_LABEL_MAP[mappedKey] ?? mappedKey,
          value,
          confidence: mapConfidence(entity.confidence ?? 0),
        } satisfies ExtractedField;
      })
      .filter((field): field is ExtractedField => Boolean(field));

    const vendorName =
      extractedFields.find((field) => field.key === "vendor")?.value?.trim() || null;

    let suggestedMappings: ColumnMapping[] = [];
    if (vendorName) {
      const { data: mappingRow } = await supabase
        .from("vendor_mappings")
        .select("column_mappings")
        .eq("organization_id", organizationId)
        .eq("vendor_name", vendorName)
        .maybeSingle();

      if (mappingRow?.column_mappings && typeof mappingRow.column_mappings === "object") {
        suggestedMappings = Object.entries(mappingRow.column_mappings as Record<string, unknown>).map(
          ([extractedKey, projectColumn]) => ({
            extractedKey,
            projectColumn: typeof projectColumn === "string" ? projectColumn : null,
          }),
        );
      }
    }

    const payload = {
      extractedFields: extractedFields.map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value,
        confidence: field.confidence,
      })),
      suggestedMappings: suggestedMappings.map((mapping) => ({
        extractedKey: mapping.extractedKey,
        projectColumn: mapping.projectColumn,
      })),
      vendorName,
    };

    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Function error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
