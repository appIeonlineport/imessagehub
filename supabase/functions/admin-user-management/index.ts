import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond({ error: "Server configuration is missing" }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller) return respond({ error: "Invalid account session" }, 401);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role,status")
    .eq("id", caller.id)
    .maybeSingle();
  if (!callerProfile || !["admin", "owner"].includes(callerProfile.role) || callerProfile.status !== "active") {
    return respond({ error: "Not authorized" }, 403);
  }

  let action = "";
  let userId = "";
  try {
    const body = await req.json();
    action = String(body?.action || "").toLowerCase();
    userId = String(body?.userId || "");
  } catch {
    return respond({ error: "Invalid JSON body" }, 400);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(userId)) return respond({ error: "Invalid user ID" }, 400);
  if (!["block", "unblock", "delete"].includes(action)) return respond({ error: "Invalid action" }, 400);
  if (userId === caller.id) return respond({ error: "You cannot manage your own admin account" }, 400);

  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return respond({ error: "User not found" }, 404);
  if (["admin", "owner"].includes(target.role)) return respond({ error: "Protected admin accounts cannot be changed" }, 403);

  if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return respond({ error: error.message }, 400);
    return respond({ success: true, action });
  }

  const blocked = action === "block";
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none"
  });
  if (authError) return respond({ error: authError.message }, 400);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ status: blocked ? "blocked" : "active" })
    .eq("id", userId);
  if (profileError) {
    await admin.auth.admin.updateUserById(userId, { ban_duration: blocked ? "none" : "876000h" });
    return respond({ error: profileError.message }, 400);
  }

  return respond({ success: true, action });
});
