-- Phase 1 security hardening for iMessage Hub.
-- Prevent users from promoting themselves through public.profiles.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own name update"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Campaign rows are created only by submit_campaign(). Users may read and
-- clear their own history, but cannot forge delivery status or cost fields.
drop policy if exists "campaign own all" on public.campaigns;
drop policy if exists "campaigns_policy" on public.campaigns;
create policy "campaigns own select"
on public.campaigns
for select
to authenticated
using ((select auth.uid()) = user_id);
create policy "campaigns own delete"
on public.campaigns
for delete
to authenticated
using ((select auth.uid()) = user_id);
revoke insert, update on table public.campaigns from authenticated;

drop policy if exists "messages own all" on public.campaign_messages;
create policy "campaign messages own select"
on public.campaign_messages
for select
to authenticated
using ((select auth.uid()) = user_id);
create policy "campaign messages own delete"
on public.campaign_messages
for delete
to authenticated
using ((select auth.uid()) = user_id);
revoke insert, update on table public.campaign_messages from authenticated;

-- A blockchain transaction may fund only one top-up request.
create unique index if not exists topup_requests_network_tx_hash_uidx
on public.topup_requests (lower(network), lower(btrim(tx_hash)))
where tx_hash is not null and btrim(tx_hash) <> '';

drop policy if exists "topups own insert" on public.topup_requests;
create policy "topups own pending insert"
on public.topup_requests
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and approved_at is null
  and approved_by is null
  and amount >= 1
  and network = 'TRC20'
  and nullif(btrim(tx_hash), '') is not null
  and user_email = (select auth.jwt()->>'email')
);

-- Remove database privileges that browser roles never need.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- SECURITY DEFINER functions must never inherit PostgreSQL's default PUBLIC
-- execute grant. Grant only the smallest role used by the application.
revoke execute on function public.admin_campaign_activity() from public, anon;
grant execute on function public.admin_campaign_activity() to authenticated;

revoke execute on function public.admin_users_overview() from public, anon;
grant execute on function public.admin_users_overview() to authenticated;

revoke execute on function public.approve_topup(uuid) from public, anon;
grant execute on function public.approve_topup(uuid) to authenticated;

revoke execute on function public.submit_campaign(uuid, text, text, text, text[]) from public, anon;
grant execute on function public.submit_campaign(uuid, text, text, text, text[]) to authenticated;

revoke execute on function public.submit_campaign(uuid, text, text, text, text[], text) from public, anon;
grant execute on function public.submit_campaign(uuid, text, text, text, text[], text) to authenticated;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
