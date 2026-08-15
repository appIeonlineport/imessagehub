-- Phase 2 foundation: provider-independent delivery lifecycle and retry metadata.
-- Browser roles remain read-only for these fields through the existing grants/RLS.

alter table public.campaign_messages
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists provider_status text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.campaign_messages
set status = 'queued',
    updated_at = now()
where status = 'pending';

alter table public.campaign_messages
  alter column status set default 'queued';

alter table public.campaign_messages
  drop constraint if exists campaign_messages_status_check;

alter table public.campaign_messages
  add constraint campaign_messages_status_check
  check (status = any (array[
    'queued'::text,
    'processing'::text,
    'sent'::text,
    'delivered'::text,
    'failed'::text
  ]));

alter table public.campaign_messages
  drop constraint if exists campaign_messages_attempt_count_check;

alter table public.campaign_messages
  add constraint campaign_messages_attempt_count_check
  check (attempt_count >= 0);

create index if not exists campaign_messages_delivery_queue_idx
  on public.campaign_messages (status, next_attempt_at, created_at)
  where status in ('queued', 'processing');

create unique index if not exists campaign_messages_provider_message_uidx
  on public.campaign_messages (coalesce(provider, ''), provider_message_id)
  where provider_message_id is not null;

comment on column public.campaign_messages.status is
  'Delivery lifecycle: queued, processing, sent, delivered, or failed.';
comment on column public.campaign_messages.provider_message_id is
  'Identifier returned by the configured sending provider.';
comment on column public.campaign_messages.attempt_count is
  'Number of provider delivery attempts made by trusted backend workers.';
