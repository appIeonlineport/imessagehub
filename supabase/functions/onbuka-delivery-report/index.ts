import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.48.0";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.min(leftBytes.length, rightBytes.length); index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expectedAppId = Deno.env.get("ONBUKA_APP_ID") || "";
  const webhookToken = Deno.env.get("ONBUKA_WEBHOOK_TOKEN") || "";
  const suppliedToken = new URL(req.url).searchParams.get("token") || "";

  if (!supabaseUrl || !serviceRoleKey || !expectedAppId || !webhookToken) {
    return jsonResponse({ error: "Webhook configuration is missing." }, 503);
  }
  if (!suppliedToken || !(await secureEqual(suppliedToken, webhookToken))) {
    return jsonResponse({ error: "Invalid webhook token." }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const reports = Array.isArray(body) ? body : [body];
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let processed = 0;
  for (const rawReport of reports) {
    const report = rawReport as Record<string, unknown>;
    const appId = String(report.appId || "");
    if (appId !== expectedAppId) continue;

    const priceDetail = (
      report.pricedetail && typeof report.pricedetail === "object"
        ? report.pricedetail
        : {}
    ) as Record<string, unknown>;
    const providerStatus = String(report.status ?? "");
    const success = providerStatus === "0";
    const costValue = Number(priceDetail.pay);

    const { data, error } = await admin.rpc("record_onbuka_delivery", {
      p_app_id: appId,
      p_order_id: String(report.orderId || ""),
      p_provider_message_id: String(report.msgid || report.msgId || ""),
      p_success: success,
      p_provider_status: providerStatus,
      p_error: success ? null : String(report.reason || "Provider delivery failed."),
      p_cost: Number.isFinite(costValue) ? costValue : null,
      p_currency: String(priceDetail.currency || "")
    });

    if (error) {
      console.error("Unable to record OnBuka delivery report", error);
      continue;
    }
    if (data === true) processed += 1;
  }

  return jsonResponse({ received: true, processed });
});
