-- The dashboard's "Clear Outbox" action deletes only rows owned by the
-- signed-in user. RLS enforces ownership; this grant enables that operation.
grant delete on table public.campaign_messages to authenticated;
grant delete on table public.campaigns to authenticated;
