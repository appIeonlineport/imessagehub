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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: "Supabase server configuration is missing." }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ error: "Authentication required." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) return jsonResponse({ error: "Invalid account session." }, 401);

  let campaignId = "";
  let demoMode = false;
  try {
    const body = await req.json();
    campaignId = String(body?.campaignId || "").trim();
    demoMode = body?.demoMode === true;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(campaignId)) return jsonResponse({ error: "A valid campaign ID is required." }, 400);

  const serviceHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };

  const campaignRes = await fetch(
    `${supabaseUrl}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,message,status`,
    { headers: serviceHeaders, signal: AbortSignal.timeout(10000) }
  );
  if (!campaignRes.ok) return jsonResponse({ error: "Unable to verify campaign.", stage: "campaign_lookup" }, 500);
  const campaigns = await campaignRes.json();
  const campaign = Array.isArray(campaigns) ? campaigns[0] : null;
  if (!campaign) return jsonResponse({ error: "Campaign not found." }, 404);

  if (demoMode) {
    return jsonResponse({
      configured: true,
      demo: true,
      provider: "demo",
      campaign_id: campaignId,
      status: "submitted",
      note: "Demo mode records the campaign as Submitted and does not attempt provider delivery."
    });
  }

  if (!telnyxApiKey || !telnyxFromNumber) return jsonResponse({ configured: false, error: "Telnyx credentials are not configured." }, 503);

  const claimRes = await fetch(
    `${supabaseUrl}/rest/v1/campaign_messages?campaign_id=eq.${encodeURIComponent(campaignId)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id,phone`,
    {
      method: "PATCH",
      headers: { ...serviceHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        status: "sending",
        provider: "telnyx",
        provider_status: "dispatching",
        last_error: null,
        updated_at: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(10000)
    }
  );
  if (!claimRes.ok) return jsonResponse({ error: "Unable to claim campaign messages.", stage: "claim_messages" }, 500);
  const claimedMessages = await claimRes.json();

  if (!Array.isArray(claimedMessages) || !claimedMessages.length) {
    return jsonResponse({ alreadyDispatched: true, provider: "telnyx" });
  }

  if (claimedMessages.length > maxRecipients) {
    await fetch(`${supabaseUrl}/rest/v1/campaign_messages?id=in.(${claimedMessages.map((m: any) => m.id).join(",")})`, {
      method: "PATCH",
      headers: serviceHeaders,
      body: JSON.stringify({
        status: "pending",
        provider_status: "test_limit",
        last_error: `Testing is limited to ${maxRecipients} recipients per campaign.`,
        updated_at: new Date().toISOString()
      })
    });
    return jsonResponse({ error: `Testing is limited to ${maxRecipients} recipients per campaign.` }, 400);
  }

  const invalid = claimedMessages.some((item: any) => {
    const digits = normalizePhone(item.phone).replace(/\D/g, "");
    return digits.length < 7 || digits.length > 15;
  });
  if (invalid) {
    await fetch(`${supabaseUrl}/rest/v1/campaign_messages?id=in.(${claimedMessages.map((m: any) => m.id).join(",")})`, {
      method: "PATCH",
      headers: serviceHeaders,
      body: JSON.stringify({
        status: "pending",
        provider_status: "invalid_recipient",
        last_error: "Use international numbers with a country code.",
        updated_at: new Date().toISOString()
      })
    });
    return jsonResponse({ error: "One or more recipient numbers are invalid. Use international numbers with a country code." }, 400);
  }

  const results: Array<Record<string, unknown>> = [];
  for (const message of claimedMessages) {
    const to = normalizePhone(message.phone);
    try {
      const providerResponse = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${telnyxApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: telnyxFromNumber, to, text: String(campaign.message || "") }),
        signal: AbortSignal.timeout(30000)
      });

      const responseText = await providerResponse.text();
      let payload: any = {};
      try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = {}; }
      const data = payload?.data || {};
      const toRows = Array.isArray(data?.to) ? data.to : [];
      const providerStatus = String(toRows[0]?.status || (providerResponse.ok ? "queued" : "rejected"));
      const providerMessageId = String(data?.id || "");
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
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

  const settleRes = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_telnyx_dispatch`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ p_campaign_id: campaignId, p_results: results }),
    signal: AbortSignal.timeout(10000)
  });
  const settleText = await settleRes.text();
  let settlement: any = null;
  try { settlement = settleText ? JSON.parse(settleText) : null; } catch { settlement = null; }
  if (!settleRes.ok) {
    console.error("Telnyx settlement failed", settleText);
    return jsonResponse({ error: "Telnyx responded, but local delivery status could not be settled.", stage: "settlement" }, 500);
  }

  const settled = Array.isArray(settlement) ? settlement[0] : settlement;
  return jsonResponse({
    configured: true,
    provider: "telnyx",
    sent: Number(settled?.sent_count || 0),
    failed: Number(settled?.failed_count || 0),
    refunded: Number(settled?.refund_amount || 0),
    reason: results.find((item) => item.status === "failed")?.last_error || "Telnyx accepted the message(s).",
    results: results.map((item) => ({ status: item.status, provider_status: item.provider_status, error: item.last_error }))
  });
});
