create or replace function public.submit_campaign(p_route_id uuid, p_name text, p_sender_id text, p_message text, p_recipients text[])
returns table(campaign_id uuid, total_cost numeric, new_balance numeric, recipient_count integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  select r.* into v_route
  from public.routes r
  left join public.user_route_access ura
    on ura.user_id = v_user_id and ura.route_id = r.id
  where r.id = p_route_id
    and r.enabled = true
    and coalesce(ura.enabled, true) = true;
  if not found then raise exception 'Selected route is unavailable for this account'; end if;

  -- Portal billing is one route charge per recipient regardless of message length.
  v_total := round((v_count::numeric * v_route.price_per_message), 4);

  select balance into v_wallet_balance
  from public.wallets
  where user_id = v_user_id
  for update;

  if not found then
    insert into public.wallets (user_id, balance, updated_at)
    values (v_user_id, 0, now())
    on conflict (user_id) do nothing;
    v_wallet_balance := 0;
  end if;

  if v_wallet_balance < v_total then
    raise exception 'Insufficient balance. Required $%, available $%',
      to_char(v_total, 'FM999999990.00'),
      to_char(v_wallet_balance, 'FM999999990.00');
  end if;

  insert into public.campaigns (
    user_id, route_id, name, sender_id, message, recipient_count,
    total_recipients, pending_count, queued_count, sent_count,
    delivered_count, failed_count, total_cost, status, updated_at
  ) values (
    v_user_id, p_route_id,
    coalesce(nullif(btrim(p_name), ''), 'Campaign'),
    coalesce(nullif(btrim(p_sender_id), ''), 'iMessage-Direct'),
    p_message,
    v_count, v_count, v_count, v_count, 0, 0, 0,
    v_total, 'processing', now()
  ) returning id into v_campaign_id;

  insert into public.campaign_messages (campaign_id, user_id, phone, status)
  select v_campaign_id, v_user_id, recipient, 'pending'
  from unnest(p_recipients) as recipient;

  update public.wallets
  set balance = balance - v_total,
      updated_at = now()
  where user_id = v_user_id
  returning balance into v_wallet_balance;

  insert into public.wallet_transactions (user_id, type, amount, reference, created_by)
  values (v_user_id, 'debit', v_total, 'campaign:' || v_campaign_id::text, v_user_id);

  return query
  select v_campaign_id, v_total, v_wallet_balance, v_count;
end;
$function$;
