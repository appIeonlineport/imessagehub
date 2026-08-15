-- Return iMessage Hub to the Phase 1 delivery model.
-- Real provider lifecycle fields will be added only when a provider is selected.

drop index if exists public.campaign_messages_delivery_queue_idx;
drop index if exists public.campaign_messages_provider_message_uidx;

alter table public.campaign_messages
  drop constraint if exists campaign_messages_status_check;

update public.campaign_messages
set status = 'pending'
where status in ('queued', 'processing', 'sent');

alter table public.campaign_messages
  alter column status set default 'pending';

alter table public.campaign_messages
  add constraint campaign_messages_status_check
  check (status = any (array[
    'pending'::text,
    'delivered'::text,
    'failed'::text
  ]));

alter table public.campaign_messages
  drop constraint if exists campaign_messages_attempt_count_check;

alter table public.campaign_messages
  drop column if exists provider,
  drop column if exists provider_message_id,
  drop column if exists provider_status,
  drop column if exists attempt_count,
  drop column if exists last_error,
  drop column if exists processing_started_at,
  drop column if exists sent_at,
  drop column if exists delivered_at,
  drop column if exists failed_at,
  drop column if exists next_attempt_at,
  drop column if exists updated_at;
