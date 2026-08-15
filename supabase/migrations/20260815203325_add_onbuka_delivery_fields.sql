-- OnBuka provider integration.
-- Browser users remain read-only for provider and delivery fields; trusted
-- Edge Functions use service_role-only RPCs to settle provider results.

alter table public.campaign_messages
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists provider_status text,
  add column if not exists last_error text,
  add column if not exists actual_cost numeric(12, 6),
  add column if not exists provider_currency text,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.campaign_messages
  drop constraint if exists campaign_messages_status_check;

alter table public.campaign_messages
  add constraint campaign_messages_status_check
  check (status = any (array[
    'pending'::text,
    'sending'::text,
    'sent'::text,
    'delivered'::text,
    'failed'::text
  ]));

create unique index if not exists campaign_messages_onbuka_message_uidx
  on public.campaign_messages (provider, provider_message_id)
  where provider_message_id is not null;

create index if not exists campaign_messages_campaign_status_idx
  on public.campaign_messages (campaign_id, status);

create unique index if not exists wallet_transactions_provider_refund_uidx
  on public.wallet_transactions (reference)
  where reference like 'campaign_provider_refund:%';

comment on column public.campaign_messages.status is
  'Portal/provider state: pending, sending, sent, delivered, or failed.';
comment on column public.campaign_messages.provider_message_id is
  'Provider identifier returned after the provider accepts a message.';
comment on column public.campaign_messages.actual_cost is
  'Actual provider cost reported by the delivery callback.';

create or replace function public.settle_onbuka_dispatch(
  p_campaign_id uuid,
  p_results jsonb
)
returns table (
  sent_count integer,
  failed_count integer,
  refund_amount numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_campaign public.campaigns%rowtype;
  v_price numeric := 0;
  v_sent integer := 0;
  v_failed integer := 0;
  v_refund numeric := 0;
  v_refund_transaction uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if jsonb_typeof(p_results) <> 'array' then
    raise exception 'Dispatch results must be a JSON array';
  end if;

  select c.*
  into v_campaign
  from public.campaigns c
  where c.id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found';
  end if;

  select coalesce(r.price_per_message, 0)
  into v_price
  from public.routes r
  where r.id = v_campaign.route_id;

  with parsed as (
    select
      (item->>'id')::uuid as id,
      case when item->>'status' = 'sent' then 'sent' else 'failed' end as status,
      nullif(item->>'provider_message_id', '') as provider_message_id,
      nullif(item->>'provider_status', '') as provider_status,
      nullif(item->>'last_error', '') as last_error
    from jsonb_array_elements(p_results) item
  ),
  updated as (
    update public.campaign_messages m
    set
      status = p.status,
      provider = 'onbuka',
      provider_message_id = p.provider_message_id,
      provider_status = p.provider_status,
      last_error = p.last_error,
      sent_at = case when p.status = 'sent' then now() else m.sent_at end,
      failed_at = case when p.status = 'failed' then now() else m.failed_at end,
      updated_at = now()
    from parsed p
    where m.id = p.id
      and m.campaign_id = p_campaign_id
      and m.status = 'sending'
    returning m.status
  )
  select
    count(*) filter (where status = 'sent')::integer,
    count(*) filter (where status = 'failed')::integer
  into v_sent, v_failed
  from updated;

  v_refund := round(v_failed::numeric * v_price, 4);

  if v_refund > 0 then
    insert into public.wallet_transactions (
      user_id,
      type,
      amount,
      reference,
      created_by
    ) values (
      v_campaign.user_id,
      'credit',
      v_refund,
      'campaign_provider_refund:' || p_campaign_id::text,
      v_campaign.user_id
    )
    on conflict do nothing
    returning id into v_refund_transaction;

    if v_refund_transaction is not null then
      update public.wallets
      set balance = balance + v_refund,
          updated_at = now()
      where user_id = v_campaign.user_id;
    else
      v_refund := 0;
    end if;
  end if;

  update public.campaigns c
  set
    sent_count = counts.sent_count,
    delivered_count = counts.delivered_count,
    failed_count = counts.failed_count,
    pending_count = counts.pending_count,
    queued_count = counts.pending_count,
    status = case
      when counts.failed_count = counts.total_count then 'failed'
      when counts.pending_count = 0
        and counts.sent_count = 0
        and counts.delivered_count + counts.failed_count = counts.total_count
        then 'completed'
      else 'processing'
    end,
    updated_at = now()
  from (
    select
      count(*)::integer as total_count,
      count(*) filter (where m.status in ('pending', 'sending'))::integer as pending_count,
      count(*) filter (where m.status = 'sent')::integer as sent_count,
      count(*) filter (where m.status = 'delivered')::integer as delivered_count,
      count(*) filter (where m.status = 'failed')::integer as failed_count
    from public.campaign_messages m
    where m.campaign_id = p_campaign_id
  ) counts
  where c.id = p_campaign_id;

  return query select v_sent, v_failed, v_refund;
end;
$function$;

create or replace function public.record_onbuka_delivery(
  p_app_id text,
  p_order_id text,
  p_provider_message_id text,
  p_success boolean,
  p_provider_status text,
  p_error text,
  p_cost numeric,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_message_id uuid;
  v_campaign_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  begin
    v_message_id := nullif(p_order_id, '')::uuid;
  exception when invalid_text_representation then
    v_message_id := null;
  end;

  select m.id, m.campaign_id
  into v_message_id, v_campaign_id
  from public.campaign_messages m
  where
    (v_message_id is not null and m.id = v_message_id)
    or (
      nullif(p_provider_message_id, '') is not null
      and m.provider = 'onbuka'
      and m.provider_message_id = p_provider_message_id
    )
  order by case when m.id = v_message_id then 0 else 1 end
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update public.campaign_messages
  set
    status = case when p_success then 'delivered' else 'failed' end,
    provider = 'onbuka',
    provider_message_id = coalesce(nullif(p_provider_message_id, ''), provider_message_id),
    provider_status = nullif(p_provider_status, ''),
    last_error = case when p_success then null else nullif(p_error, '') end,
    actual_cost = coalesce(p_cost, actual_cost),
    provider_currency = coalesce(nullif(p_currency, ''), provider_currency),
    delivered_at = case when p_success then now() else delivered_at end,
    failed_at = case when not p_success then now() else failed_at end,
    updated_at = now()
  where id = v_message_id;

  update public.campaigns c
  set
    sent_count = counts.sent_count,
    delivered_count = counts.delivered_count,
    failed_count = counts.failed_count,
    pending_count = counts.pending_count,
    queued_count = counts.pending_count,
    status = case
      when counts.pending_count = 0
        and counts.sent_count = 0
        and counts.delivered_count + counts.failed_count = counts.total_count
        then case when counts.delivered_count > 0 then 'completed' else 'failed' end
      else 'processing'
    end,
    updated_at = now()
  from (
    select
      count(*)::integer as total_count,
      count(*) filter (where m.status in ('pending', 'sending'))::integer as pending_count,
      count(*) filter (where m.status = 'sent')::integer as sent_count,
      count(*) filter (where m.status = 'delivered')::integer as delivered_count,
      count(*) filter (where m.status = 'failed')::integer as failed_count
    from public.campaign_messages m
    where m.campaign_id = v_campaign_id
  ) counts
  where c.id = v_campaign_id;

  return true;
end;
$function$;

revoke execute on function public.settle_onbuka_dispatch(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_onbuka_dispatch(uuid, jsonb)
  to service_role;

revoke execute on function public.record_onbuka_delivery(
  text, text, text, boolean, text, text, numeric, text
) from public, anon, authenticated;
grant execute on function public.record_onbuka_delivery(
  text, text, text, boolean, text, text, numeric, text
) to service_role;
