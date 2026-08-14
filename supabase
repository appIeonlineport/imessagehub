create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 email text,
 role text not null default 'user' check(role in('user','owner')),
 status text not null default 'active' check(status in('active','suspended')),
 created_at timestamptz not null default now()
);

create table if not exists public.wallets(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 balance numeric(18,2) not null default 0 check(balance>=0),
 updated_at timestamptz not null default now()
);

create table if not exists public.topup_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 amount numeric(18,2) not null check(amount>0),
 status text not null default 'pending' check(status in('pending','paid','rejected')),
 created_at timestamptz not null default now(),
 processed_at timestamptz,
 processed_by uuid references auth.users(id)
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email) on conflict(id) do nothing;
 insert into public.wallets(user_id,balance) values(new.id,0) on conflict(user_id) do nothing;
 return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and status='active');
$$;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.topup_requests enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.is_owner());

drop policy if exists wallets_select on public.wallets;
create policy wallets_select on public.wallets for select to authenticated using(user_id=auth.uid() or public.is_owner());

drop policy if exists topups_select on public.topup_requests;
create policy topups_select on public.topup_requests for select to authenticated using(user_id=auth.uid() or public.is_owner());

drop policy if exists topups_insert on public.topup_requests;
create policy topups_insert on public.topup_requests for insert to authenticated with check(user_id=auth.uid());

create or replace function public.approve_topup(p_topup_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_topup public.topup_requests;
begin
 if not public.is_owner() then raise exception 'Owner access required'; end if;
 select * into v_topup from public.topup_requests where id=p_topup_id for update;
 if not found then raise exception 'Top-up request not found'; end if;
 if v_topup.status<>'pending' then raise exception 'Top-up is already processed'; end if;
 update public.wallets set balance=balance+v_topup.amount,updated_at=now() where user_id=v_topup.user_id;
 update public.topup_requests set status='paid',processed_at=now(),processed_by=auth.uid() where id=v_topup.id;
end; $$;

revoke all on function public.approve_topup(uuid) from public;
grant execute on function public.approve_topup(uuid) to authenticated;

-- After creating your first account, make yourself owner:
-- update public.profiles set role='owner' where email='YOUR_EMAIL_HERE';
