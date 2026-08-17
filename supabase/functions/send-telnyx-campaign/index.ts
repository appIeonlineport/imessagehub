import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function normalizePhone(value: string) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits ? `+${digits}` : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const telnyxApiKey = Deno.env.get("TELNYX_API_KEY") || "";
  const telnyxFromNumber = normalizePhone(Deno.env.get("TELNYX_FROM_NUMBER") || "");
  const maxRecipients = Math.max(1, Math.min(Number(Deno.env.get("TELNYX_MAX_RECIPIENTS") || "10"), 100));

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase server configuration is missing." }, 500);
  }
  if (!telnyxApiKey || !telnyxFromNumber) {
    return jsonResponse({ configured: false, error: "Telnyx credentials are not configured." }, 503);
  }

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ error: "Authentication required." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) return jsonResponse({ error: "Invalid account session." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Profile lookup failed", profileError);
    return jsonResponse({ error: "Unable to verify account status.", stage: "profile_lookup" }, 500);
  }
  if (!profile || String(profile.status).toLowerCase() !== "active") {
    return jsonResponse({ error: "This account is blocked." }, 403);
  }

  let campaignId = "";
  try {
    const body = await req.json();
    campaignId = String(body?.campaignId || "").trim();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(campaignId)) {
    return jsonResponse({ error: "A valid campaign ID is required." }, 400);
  }

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id,user_id,message,status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();
  if (campaignError || !campaign) {
    console.error("Campaign lookup failed", campaignError);
    return jsonResponse({ error: "Campaign not found." }, 404);
  }

  const { data: claimedMessages, error: claimError } = await admin
    .from("campaign_messages")
    .update({
      status: "sending",
      provider: "telnyx",
      provider_status: "dispatching",
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id,phone");

  if (claimError) {
    console.error("Message claim failed", claimError);
    return jsonResponse({ error: "Unable to claim campaign messages.", stage: "claim_messages" }, 500);
  }

  if (!claimedMessages?.length) {
    const { data: existing } = await admin
      .from("campaign_messages")
      .select("status")
      .eq("campaign_id", campaignId);
    return jsonResponse({
      alreadyDispatched: true,
      provider: "telnyx",
      sent: (existing || []).filter((item) => item.status === "sent").length,
      delivered: (existing || []).filter((item) => item.status === "delivered").length,
      failed: (existing || []).filter((item) => item.status === "failed").length
    });
  }

  if (claimedMessages.length > maxRecipients) {
    await admin.from("campaign_messages").update({
      status: "pending",
      provider_status: "test_limit",
      last_error: `Testing is limited to ${maxRecipients} recipients per campaign.`,
      updated_at: new Date().toISOString()
    }).in("id", claimedMessages.map((item) => item.id));
    return jsonResponse({ error: `Testing is limited to ${maxRecipients} recipients per campaign.` }, 400);
  }

  const invalidMessages = claimedMessages.filter((item) => {
    const digits = normalizePhone(String(item.phone || "")).replace(/\D/g, "");
    return digits.length < 7 || digits.length > 15;
  });
  if (invalidMessages.length) {
    await admin.from("campaign_messages").update({
      status: "pending",
      provider_status: "invalid_recipient",
      last_error: "Use international numbers with a country code.",
      updated_at: new Date().toISOString()
    }).in("id", claimedMessages.map((item) => item.id));
    return jsonResponse({ error: "One or more recipient numbers are invalid. Use international numbers with a country code." }, 400);
  }

  const results: Array<Record<string, unknown>> = [];
  for (const message of claimedMessages) {
    const to = normalizePhone(String(message.phone || ""));
    try {
      const providerResponse = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${telnyxApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: telnyxFromNumber,
          to,
          text: String(campaign.message || "")
        }),
        signal: AbortSignal.timeout(30000)
      });

      const responseText = await providerResponse.text();
      let payload: Record<string, unknown> = {};
      try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = {}; }

      const data = (payload?.data || {}) as Record<string, unknown>;
      const toRows = Array.isArray(data?.to) ? data.to as Array<Record<string, unknown>> : [];
      const providerStatus = String(toRows[0]?.status || (providerResponse.ok ? "queued" : "rejected"));
      const providerMessageId = String(data?.id || "");
      const errors = Array.isArray(payload?.errors) ? payload.errors as Array<Record<string, unknown>> : [];
      const errorDetail = String(errors[0]?.detail || errors[0]?.title || "");
      const accepted = providerResponse.ok && Boolean(providerMessageId);

      results.push({
        id: message.id,
        status: accepted ? "sent" : "failed",
        provider_message_id: providerMessageId,
        provider_status: providerStatus,
        last_error: accepted ? null : (errorDetail || `Telnyx returned HTTP ${providerResponse.status}`)
      });
    } catch (error) {
      results.push({
        id: message.id,
        status: "failed",
        provider_message_id: "",
        provider_status: "network_error",
        last_error: error instanceof Error ? error.message : "Unable to reach Telnyx."
      });
    }
  }

  const { data: settlement, error: settlementError } = await admin.rpc("settle_telnyx_dispatch", {
    p_campaign_id: campaignId,
    p_results: results
  });
  if (settlementError) {
    console.error("Telnyx dispatch settlement failed", settlementError);
    return jsonResponse({
      error: "Telnyx responded, but the local delivery record could not be settled.",
      stage: "settlement",
      providerResults: results.map((item) => ({ status: item.status, provider_status: item.provider_status, error: item.last_error }))
    }, 500);
  }

  const settled = Array.isArray(settlement) ? settlement[0] : settlement;
  return jsonResponse({
    configured: true,
    provider: "telnyx",
    from: telnyxFromNumber,
    sent: Number(settled?.sent_count || 0),
    failed: Number(settled?.failed_count || 0),
    refunded: Number(settled?.refund_amount || 0),
    reason: results.find((item) => item.status === "failed")?.last_error || "Telnyx accepted the message(s).",
    results: results.map((item) => ({
      status: item.status,
      provider_status: item.provider_status,
      error: item.last_error
    }))
  });
});
