-- Let admins preconfigure user access while a route is globally disabled.
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
         coalesce(ura.enabled, true)
  from public.profiles p
  cross join public.routes r
  left join public.user_route_access ura
    on ura.user_id = p.id and ura.route_id = r.id
  where p.role not in ('admin', 'owner')
  order by p.created_at desc, r.price_per_message asc;
end;
$$;

revoke execute on function public.admin_user_route_access() from public, anon;
grant execute on function public.admin_user_route_access() to authenticated;
