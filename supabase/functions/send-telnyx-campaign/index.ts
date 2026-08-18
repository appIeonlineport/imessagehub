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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase server configuration is missing." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ error: "Authentication required." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) return jsonResponse({ error: "Invalid account session." }, 401);

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

  const serviceHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };

  const campaignRes = await fetch(
    `${supabaseUrl}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,status`,
    { headers: serviceHeaders, signal: AbortSignal.timeout(10000) }
  );

  if (!campaignRes.ok) {
    return jsonResponse({ error: "Unable to verify campaign.", stage: "campaign_lookup" }, 500);
  }

  const campaigns = await campaignRes.json();
  const campaign = Array.isArray(campaigns) ? campaigns[0] : null;
  if (!campaign) return jsonResponse({ error: "Campaign not found." }, 404);

  // Provider dispatch is intentionally paused. The campaign remains in its
  // locally submitted/pending state until a sending provider is enabled again.
  return jsonResponse({
    configured: true,
    provider: "paused",
    queued: true,
    campaign_id: campaignId,
    status: "submitted",
    note: "Campaign submitted to the portal queue. Delivery has not been attempted or confirmed."
  });
});
