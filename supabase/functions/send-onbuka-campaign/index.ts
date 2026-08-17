import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.48.0";
import md5 from "npm:blueimp-md5@2.19.0";

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
  return value.replace(/[^0-9]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const onbukaApiKey = Deno.env.get("ONBUKA_API_KEY");
  const onbukaApiSecret = Deno.env.get("ONBUKA_API_SECRET");
  const onbukaAppId = Deno.env.get("ONBUKA_APP_ID");
  const approvedSenderId = Deno.env.get("ONBUKA_SENDER_ID")?.trim() || "";
  const maxRecipients = Math.max(
    1,
    Math.min(Number(Deno.env.get("ONBUKA_MAX_RECIPIENTS") || "10"), 1000)
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase server configuration is missing." }, 500);
  }
  if (!onbukaApiKey || !onbukaApiSecret || !onbukaAppId) {
    return jsonResponse({
      configured: false,
      error: "OnBuka credentials are not configured."
    }, 503);
  }

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const {
    data: { user },
    error: userError
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid account session." }, 401);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.status !== "active") {
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
    .select("id,user_id,message,sender_id,status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) {
    return jsonResponse({ error: "Campaign not found." }, 404);
  }

  const { data: claimedMessages, error: claimError } = await admin
    .from("campaign_messages")
    .update({
      status: "sending",
      provider: "onbuka",
      provider_status: "dispatching",
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id,phone");

  if (claimError) {
    return jsonResponse({ error: "Unable to claim campaign messages." }, 500);
  }

  if (!claimedMessages?.length) {
    const { data: existing } = await admin
      .from("campaign_messages")
      .select("status")
      .eq("campaign_id", campaignId);

    return jsonResponse({
      alreadyDispatched: true,
      sent: (existing || []).filter((item) => item.status === "sent").length,
      delivered: (existing || []).filter((item) => item.status === "delivered").length,
      failed: (existing || []).filter((item) => item.status === "failed").length
    });
  }

  if (claimedMessages.length > maxRecipients) {
    await admin
      .from("campaign_messages")
      .update({
        status: "pending",
        provider_status: "test_limit",
        last_error: `Testing is limited to ${maxRecipients} recipients per campaign.`,
        updated_at: new Date().toISOString()
      })
      .in("id", claimedMessages.map((item) => item.id));

    return jsonResponse({
      error: `Testing is limited to ${maxRecipients} recipients per campaign.`
    }, 400);
  }

  const invalidMessages = claimedMessages.filter((item) => {
    const phone = normalizePhone(String(item.phone || ""));
    return phone.length < 7 || phone.length > 15;
  });

  if (invalidMessages.length) {
    await admin
      .from("campaign_messages")
      .update({
        status: "pending",
        provider_status: "invalid_recipient",
        last_error: "Use international numbers with a country code.",
        updated_at: new Date().toISOString()
      })
      .in("id", claimedMessages.map((item) => item.id));

    return jsonResponse({
      error: "One or more recipient numbers are invalid. Use international numbers with a country code."
    }, 400);
  }

  const numbers = claimedMessages.map((item) => normalizePhone(String(item.phone)));
  const orderIds = claimedMessages.map((item) => item.id);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sign = md5(`${onbukaApiKey}${onbukaApiSecret}${timestamp}`);
  const requestBody: Record<string, string> = {
    appId: onbukaAppId,
    numbers: numbers.join(","),
    content: String(campaign.message || ""),
    orderId: orderIds.join(",")
  };

  if (approvedSenderId) requestBody.senderId = approvedSenderId.slice(0, 32);

  let providerPayload: Record<string, unknown>;
  try {
    const providerResponse = await fetch("https://api.onbuka.com/v3/sendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Api-Key": onbukaApiKey,
        "Timestamp": timestamp,
        "Sign": sign
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    });

    const responseText = await providerResponse.text();
    try {
      providerPayload = JSON.parse(responseText);
    } catch {
      throw new Error(`OnBuka returned HTTP ${providerResponse.status} with an invalid response.`);
    }
  } catch (error) {
    await admin
      .from("campaign_messages")
      .update({
        status: "pending",
        provider_status: "network_error",
        last_error: error instanceof Error ? error.message : "Provider request failed.",
        updated_at: new Date().toISOString()
      })
      .in("id", claimedMessages.map((item) => item.id));

    return jsonResponse({
      error: error instanceof Error ? error.message : "Unable to reach OnBuka."
    }, 502);
  }

  const providerStatus = String(providerPayload.status ?? "");
  const providerReason = String(providerPayload.reason ?? "Provider rejected the request.");
  const acceptedRows = Array.isArray(providerPayload.array)
    ? providerPayload.array as Array<Record<string, unknown>>
    : [];
  const acceptedByOrderId = new Map(
    acceptedRows.map((item) => [
      String(item.orderId || ""),
      String(item.msgId || "")
    ])
  );

  const results = claimedMessages.map((message) => {
    const providerMessageId = acceptedByOrderId.get(message.id) || "";
    const accepted = providerStatus === "0" && Boolean(providerMessageId);
    return {
      id: message.id,
      status: accepted ? "sent" : "failed",
      provider_message_id: providerMessageId,
      provider_status: accepted ? "accepted" : `rejected:${providerStatus || "unknown"}`,
      last_error: accepted ? null : providerReason
    };
  });

  const { data: settlement, error: settlementError } = await admin.rpc(
    "settle_onbuka_dispatch",
    {
      p_campaign_id: campaignId,
      p_results: results
    }
  );

  if (settlementError) {
    console.error("Dispatch settlement failed", settlementError);
    return jsonResponse({
      error: "OnBuka responded, but the local delivery record could not be settled.",
      providerStatus
    }, 500);
  }

  const settled = Array.isArray(settlement) ? settlement[0] : settlement;
  return jsonResponse({
    configured: true,
    provider: "onbuka",
    providerStatus,
    reason: providerReason,
    sent: Number(settled?.sent_count || 0),
    failed: Number(settled?.failed_count || 0),
    refunded: Number(settled?.refund_amount || 0)
  }, providerStatus === "0" ? 200 : 422);
});
