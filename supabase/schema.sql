-- ==========================================================================
-- iMessage Hub — Supabase Cloud Database Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================================

-- 1. Top-Up Requests Table (USDT TRC20 Verification)
create table if not exists public.topup_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  amount numeric(10,2) not null default 99.00,
  network text not null default 'TRC20',
  wallet_address text not null default 'TWhUtsbWiR3gQE6yi9CirRQSR1zKAR9FJd',
  tx_hash text not null,
  status text not null default 'pending', -- 'pending', 'paid', 'expired', 'rejected'
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- 2. Outbox & Campaign Messages Table
create table if not exists public.campaign_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  msg_id text not null,
  recipient text not null,
  body text not null,
  sender_id text not null default 'iMessage-Direct',
  channel text not null default 'APNs',
  status text not null default 'Delivered',
  created_at timestamptz default now()
);

-- 3. Wallet Transactions Ledger
create table if not exists public.wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null, -- 'credit', 'debit'
  amount numeric(10,2) not null,
  description text,
  reference_id uuid,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.topup_requests enable row level security;
alter table public.campaign_messages enable row level security;
alter table public.wallet_transactions enable row level security;

-- RLS Policies
create policy "Users can view their own topups"
  on public.topup_requests for select
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'indiatryme@gmail.com');

create policy "Users can insert topups"
  on public.topup_requests for insert
  with check (auth.uid() = user_id);

create policy "Admin can update topups"
  on public.topup_requests for update
  using (auth.jwt()->>'email' = 'indiatryme@gmail.com');

create policy "Users can view their campaign messages"
  on public.campaign_messages for select
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'indiatryme@gmail.com');

create policy "Users can insert campaign messages"
  on public.campaign_messages for insert
  with check (auth.uid() = user_id);
