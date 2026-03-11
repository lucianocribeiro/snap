// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";
import { DocumentProcessorServiceClient } from "npm:@google-cloud/documentai@8";

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
    const location = Deno.env.get("GOOGLE_DOCUMENT_AI_LOCATION");
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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = profile?.organization_id;
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organization not found for user." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const storagePath = toStoragePath(fileUrl);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("invoices")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download invoice file: ${downloadError?.message ?? "unknown error"}`);
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const base64Content = btoa(String.fromCharCode(...bytes));

    const credentials = JSON.parse(credentialsJson);
    const documentClient = new DocumentProcessorServiceClient({ credentials });
    const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}/processorVersions/pretrained-invoice-v2.0-2023-12-06`;

    const [result] = await documentClient.processDocument({
      name: processorName,
      rawDocument: {
        content: base64Content,
        mimeType: fileData.type || "application/pdf",
      },
    });

    const entities = result.document?.entities ?? [];
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

    return new Response(
      JSON.stringify({
        extractedFields,
        suggestedMappings,
        vendorName,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
