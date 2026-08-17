create or replace function public.settle_telnyx_dispatch(
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
  if jsonb_typeof(p_results) <> 'array' then
    raise exception 'Dispatch results must be a JSON array';
  end if;

  select c.* into v_campaign
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
      provider = 'telnyx',
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
      user_id, type, amount, reference, created_by
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

revoke execute on function public.settle_telnyx_dispatch(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_telnyx_dispatch(uuid, jsonb)
  to service_role;
