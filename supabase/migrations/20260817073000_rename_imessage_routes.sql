-- Present product-facing route names consistently across the portal.
update public.routes
set name = case code
  when 'US-A' then 'iMessage Route'
  when 'US-B' then 'iMessage with Link'
  else name
end,
updated_at = now()
where code in ('US-A', 'US-B');

create or replace function public.admin_campaign_activity()
returns table (
  campaign_id uuid,
  user_id uuid,
  user_email text,
  campaign_name text,
  source_file_name text,
  route_id uuid,
  route_name text,
  total_recipients integer,
  total_cost numeric,
  campaign_status text,
  created_at timestamptz
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
    c.route_id,
    coalesce(r.name, 'Route'),
    coalesce(c.total_recipients, c.recipient_count, 0),
    coalesce(c.total_cost, 0)::numeric,
    c.status,
    c.created_at
  from public.campaigns c
  left join public.profiles p on p.id = c.user_id
  left join public.routes r on r.id = c.route_id
  order by c.created_at desc
  limit 500;
end;
$function$;

revoke execute on function public.admin_campaign_activity() from public, anon;
grant execute on function public.admin_campaign_activity() to authenticated;
