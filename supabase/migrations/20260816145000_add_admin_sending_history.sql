-- Secure admin-only campaign archive with recipient numbers.
create or replace function public.admin_sending_history()
returns table (
  campaign_id uuid,
  user_id uuid,
  user_email text,
  campaign_name text,
  source_file_name text,
  sender_id text,
  message text,
  total_recipients integer,
  delivered_count integer,
  failed_count integer,
  campaign_status text,
  created_at timestamptz,
  phones text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    c.id,
    c.user_id,
    p.email,
    c.name,
    c.source_file_name,
    c.sender_id,
    c.message,
    coalesce(c.total_recipients, c.recipient_count, cardinality(coalesce(m.phones, array[]::text[])), 0)::integer,
    coalesce(m.delivered_count, c.delivered_count, 0)::integer,
    coalesce(m.failed_count, c.failed_count, 0)::integer,
    c.status,
    c.created_at,
    coalesce(m.phones, array[]::text[])
  from public.campaigns c
  left join public.profiles p on p.id = c.user_id
  left join lateral (
    select
      array_agg(cm.phone order by cm.created_at, cm.id) filter (where cm.phone is not null) as phones,
      count(*) filter (where cm.status = 'delivered')::integer as delivered_count,
      count(*) filter (where cm.status = 'failed')::integer as failed_count
    from public.campaign_messages cm
    where cm.campaign_id = c.id
  ) m on true
  order by c.created_at desc
  limit 500;
end;
$function$;

revoke execute on function public.admin_sending_history() from public, anon;
grant execute on function public.admin_sending_history() to authenticated;
