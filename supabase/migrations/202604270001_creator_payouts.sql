alter table public.profiles
  add column if not exists stripe_account_id text unique,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false;

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_account_id text not null,
  amount_jpy integer not null check (amount_jpy > 0),
  source_paid_coins integer not null check (source_paid_coins > 0),
  status text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'failed', 'cancelled')),
  stripe_transfer_id text unique,
  stripe_payout_id text unique,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payout_requests
  add column if not exists stripe_payout_id text unique,
  add column if not exists failure_code text,
  add column if not exists failure_message text;

alter table public.payout_requests enable row level security;

drop policy if exists "Users can read own payout requests" on public.payout_requests;
create policy "Users can read own payout requests"
  on public.payout_requests
  for select
  using (auth.uid() = user_id);

create table if not exists public.stripe_payout_events (
  stripe_payout_id text primary key,
  stripe_account_id text not null,
  amount_jpy integer not null default 0,
  status text not null,
  failure_code text,
  failure_message text,
  arrival_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_payout_events enable row level security;
