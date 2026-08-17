grant usage on schema public to service_role;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.campaigns to service_role;
grant select, insert, update, delete on table public.campaign_messages to service_role;
grant select, insert, update, delete on table public.routes to service_role;
grant select, insert, update, delete on table public.wallets to service_role;
grant select, insert, update, delete on table public.wallet_transactions to service_role;
grant select, insert, update, delete on table public.user_route_access to service_role;

grant execute on function public.settle_telnyx_dispatch(uuid, jsonb) to service_role;
