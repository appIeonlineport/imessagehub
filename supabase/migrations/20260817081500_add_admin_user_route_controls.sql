-- Per-user route access and secure admin controls.
create table if not exists public.user_route_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (user_id, route_id)
);

alter table public.user_route_access enable row level security;
revoke all on table public.user_route_access from anon, authenticated;

create or replace function public.available_routes_for_user()
returns table (
  id uuid,
  name text,
  code text,
  description text,
  enabled boolean,
  price_per_message numeric,
  currency text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ) then
    raise exception 'This account is blocked';
  end if;

  return query
  select r.id, r.name, r.code, r.description, r.enabled,
         r.price_per_message, r.currency, r.created_at
  from public.routes r
  left join public.user_route_access ura
    on ura.user_id = auth.uid() and ura.route_id = r.id
  where r.enabled = true
    and coalesce(ura.enabled, true) = true
  order by r.price_per_message asc, r.created_at asc;
end;
$$;

create or replace function public.admin_user_route_access()
returns table (
  user_id uuid,
  route_id uuid,
  route_name text,
  route_code text,
  route_enabled boolean,
  allowed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select p.id, r.id, r.name, r.code, r.enabled,
         (r.enabled and coalesce(ura.enabled, true))
  from public.profiles p
  cross join public.routes r
  left join public.user_route_access ura
    on ura.user_id = p.id and ura.route_id = r.id
  where p.role not in ('admin', 'owner')
  order by p.created_at desc, r.price_per_message asc;
end;
$$;

create or replace function public.admin_set_user_route_access(
  p_user_id uuid,
  p_route_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role not in ('admin', 'owner')
  ) then
    raise exception 'User not found or protected';
  end if;

  if not exists (select 1 from public.routes where id = p_route_id) then
    raise exception 'Route not found';
  end if;

  insert into public.user_route_access (user_id, route_id, enabled, updated_at, updated_by)
  values (p_user_id, p_route_id, p_enabled, now(), auth.uid())
  on conflict (user_id, route_id) do update
  set enabled = excluded.enabled,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;
end;
$$;

revoke execute on function public.available_routes_for_user() from public, anon;
grant execute on function public.available_routes_for_user() to authenticated;
revoke execute on function public.admin_user_route_access() from public, anon;
grant execute on function public.admin_user_route_access() to authenticated;
revoke execute on function public.admin_set_user_route_access(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_route_access(uuid, uuid, boolean) to authenticated;

-- Enforce account status and per-user access during wallet debit/campaign creation.
create or replace function public.submit_campaign(
  p_route_id uuid,
  p_name text,
  p_sender_id text,
  p_message text,
  p_recipients text[]
)
returns table(campaign_id uuid, total_cost numeric, new_balance numeric, recipient_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_route public.routes%rowtype;
  v_wallet_balance numeric;
  v_count integer;
  v_total numeric;
  v_campaign_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and status = 'active') then
    raise exception 'This account is blocked';
  end if;

  v_count := coalesce(array_length(p_recipients, 1), 0);
  if v_count <= 0 then raise exception 'At least one recipient is required'; end if;
  if nullif(btrim(p_message), '') is null then raise exception 'Message content is required'; end if;
  if char_length(p_message) > 160 then raise exception 'Message cannot exceed 160 characters'; end if;

  select r.* into v_route
  from public.routes r
  left join public.user_route_access ura
    on ura.user_id = v_user_id and ura.route_id = r.id
  where r.id = p_route_id
    and r.enabled = true
    and coalesce(ura.enabled, true) = true;
  if not found then raise exception 'Selected route is unavailable for this account'; end if;

  v_total := round((v_count::numeric * v_route.price_per_message), 4);
  select balance into v_wallet_balance from public.wallets where user_id = v_user_id for update;
  if not found then
    insert into public.wallets (user_id, balance, updated_at)
    values (v_user_id, 0, now()) on conflict (user_id) do nothing;
    v_wallet_balance := 0;
  end if;
  if v_wallet_balance < v_total then
    raise exception 'Insufficient balance. Required $%, available $%',
      to_char(v_total, 'FM999999990.00'), to_char(v_wallet_balance, 'FM999999990.00');
  end if;

  insert into public.campaigns (
    user_id, route_id, name, sender_id, message, recipient_count,
    total_recipients, pending_count, queued_count, sent_count,
    delivered_count, failed_count, total_cost, status, updated_at
  ) values (
    v_user_id, p_route_id, coalesce(nullif(btrim(p_name), ''), 'Campaign'),
    coalesce(nullif(btrim(p_sender_id), ''), 'iMessage-Direct'), p_message,
    v_count, v_count, v_count, v_count, 0, 0, 0, v_total, 'processing', now()
  ) returning id into v_campaign_id;

  insert into public.campaign_messages (campaign_id, user_id, phone, status)
  select v_campaign_id, v_user_id, recipient, 'pending'
  from unnest(p_recipients) as recipient;

  update public.wallets set balance = balance - v_total, updated_at = now()
  where user_id = v_user_id returning balance into v_wallet_balance;

  insert into public.wallet_transactions (user_id, type, amount, reference, created_by)
  values (v_user_id, 'debit', v_total, 'campaign:' || v_campaign_id::text, v_user_id);

  return query select v_campaign_id, v_total, v_wallet_balance, v_count;
end;
$$;
