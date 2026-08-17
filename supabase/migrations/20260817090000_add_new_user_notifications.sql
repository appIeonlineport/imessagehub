-- Secure admin feed for recent customer registrations.
create or replace function public.admin_new_user_notifications(p_limit integer default 20)
returns table (
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz
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
  select p.id, p.full_name, p.email, p.created_at
  from public.profiles p
  where p.role not in ('admin', 'owner')
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

revoke execute on function public.admin_new_user_notifications(integer) from public, anon;
grant execute on function public.admin_new_user_notifications(integer) to authenticated;
