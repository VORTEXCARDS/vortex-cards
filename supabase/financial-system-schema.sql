-- VORTEXCARDS: secure financial and card-accounting foundation
-- Run in Supabase SQL Editor as project owner.
-- This creates accounting/request tables only. It does NOT credit balances or process payments.

create table if not exists public.wallet_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_code text not null check (asset_code in ('USDT','BTC','ETH','TON','USDC','VTX')),
  amount numeric(38,18) not null check (amount <> 0),
  entry_type text not null check (entry_type in (
    'deposit','withdrawal','exchange_in','exchange_out',
    'card_purchase','card_sale','marketplace_fee','withdrawal_fee',
    'buyback','referral_reward','adjustment','refund'
  )),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists wallet_ledger_user_asset_idx
  on public.wallet_ledger(user_id, asset_code, created_at desc);
create index if not exists wallet_ledger_reference_idx
  on public.wallet_ledger(reference_type, reference_id);

create table if not exists public.crypto_deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_code text not null check (asset_code in ('USDT','BTC','ETH','TON','USDC')),
  network text not null,
  amount_expected numeric(38,18) check (amount_expected is null or amount_expected > 0),
  amount_received numeric(38,18) check (amount_received is null or amount_received >= 0),
  transaction_hash text,
  status text not null default 'pending'
    check (status in ('pending','detected','confirming','confirmed','rejected','expired')),
  provider_reference text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists crypto_deposit_tx_unique
  on public.crypto_deposit_requests(asset_code, network, transaction_hash)
  where transaction_hash is not null and transaction_hash <> '';
create index if not exists crypto_deposit_user_created_idx
  on public.crypto_deposit_requests(user_id, created_at desc);

create table if not exists public.crypto_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_code text not null check (asset_code in ('USDT','BTC','ETH','TON','USDC')),
  network text not null,
  amount numeric(38,18) not null check (amount > 0),
  fee numeric(38,18) not null default 0 check (fee >= 0),
  destination_address text not null,
  status text not null default 'pending'
    check (status in ('pending','under_review','approved','processing','completed','rejected','cancelled')),
  tx_hash text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists crypto_withdrawal_user_created_idx
  on public.crypto_withdrawal_requests(user_id, created_at desc);

create table if not exists public.exchange_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  from_asset text not null check (from_asset in ('USDT','BTC','ETH','TON','USDC')),
  to_asset text not null default 'VTX' check (to_asset = 'VTX'),
  amount_in numeric(38,18) not null check (amount_in > 0),
  rate numeric(38,18) not null check (rate > 0),
  amount_out numeric(38,18) not null check (amount_out > 0),
  fee numeric(38,18) not null default 0 check (fee >= 0),
  status text not null default 'pending'
    check (status in ('pending','quoted','completed','rejected','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists exchange_user_created_idx
  on public.exchange_requests(user_id, created_at desc);

-- One row represents one uniquely issued card. Do not create rows for demo cards.
create table if not exists public.card_inventory (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'owned'
    check (status in ('owned','listed','reserved','sold','retired')),
  listing_id uuid references public.market_listings(id) on delete set null,
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists card_inventory_owner_status_idx
  on public.card_inventory(owner_id, status);
create index if not exists card_inventory_listing_idx
  on public.card_inventory(listing_id);

-- RLS: users can read their own records; admins can read all records.
-- Financial ledger is append-only for clients. Only trusted server/service-role
-- operations should write ledger entries or change request statuses.
alter table public.wallet_ledger enable row level security;
alter table public.crypto_deposit_requests enable row level security;
alter table public.crypto_withdrawal_requests enable row level security;
alter table public.exchange_requests enable row level security;
alter table public.card_inventory enable row level security;

drop policy if exists "Users read own wallet ledger" on public.wallet_ledger;
create policy "Users read own wallet ledger" on public.wallet_ledger
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users read own deposit requests" on public.crypto_deposit_requests;
create policy "Users read own deposit requests" on public.crypto_deposit_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Users create own deposit requests" on public.crypto_deposit_requests;
create policy "Users create own deposit requests" on public.crypto_deposit_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users read own withdrawal requests" on public.crypto_withdrawal_requests;
create policy "Users read own withdrawal requests" on public.crypto_withdrawal_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Users create own withdrawal requests" on public.crypto_withdrawal_requests;
create policy "Users create own withdrawal requests" on public.crypto_withdrawal_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users read own exchange requests" on public.exchange_requests;
create policy "Users read own exchange requests" on public.exchange_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Users create own exchange requests" on public.exchange_requests;
create policy "Users create own exchange requests" on public.exchange_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users read own cards" on public.card_inventory;
create policy "Users read own cards" on public.card_inventory
  for select to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Explicitly prevent client-side balance manipulation.
revoke insert, update, delete on public.wallet_ledger from anon, authenticated;
revoke update, delete on public.crypto_deposit_requests from anon, authenticated;
revoke update, delete on public.crypto_withdrawal_requests from anon, authenticated;
revoke update, delete on public.exchange_requests from anon, authenticated;
revoke insert, update, delete on public.card_inventory from anon, authenticated;

-- Admin visibility policies for request queues and card inventory are included
-- in the SELECT policies above through public.is_admin().
