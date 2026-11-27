-- VORTEX UNIT: active card requests and private conversations
create table if not exists public.card_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  card_number text not null check (length(card_number) between 1 and 40),
  quantity integer not null check (quantity between 1 and 1000000),
  desired_price numeric(30,10) not null check (desired_price > 0),
  asset_code text not null check (asset_code in ('USDT','BTC','ETH','TON','USDC')),
  details text not null default '' check (length(details) <= 1000),
  status text not null default 'open' check (status in ('open','closed','fulfilled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists card_requests_status_created_idx on public.card_requests(status, created_at desc);
create table if not exists public.card_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.card_requests(id) on delete cascade,
  responder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(request_id, responder_id),
  check (responder_id is not null)
);
create table if not exists public.card_request_messages (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.card_request_responses(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists card_request_messages_thread_idx on public.card_request_messages(response_id, created_at);
alter table public.card_requests enable row level security;
alter table public.card_request_responses enable row level security;
alter table public.card_request_messages enable row level security;
drop policy if exists "Members read open card requests" on public.card_requests;
create policy "Members read open card requests" on public.card_requests for select to authenticated using (status = 'open' or requester_id = auth.uid());
drop policy if exists "Members create own card requests" on public.card_requests;
create policy "Members create own card requests" on public.card_requests for insert to authenticated with check (requester_id = auth.uid());
drop policy if exists "Owners update own card requests" on public.card_requests;
create policy "Owners update own card requests" on public.card_requests for update to authenticated using (requester_id = auth.uid()) with check (requester_id = auth.uid());
drop policy if exists "Owners delete own card requests" on public.card_requests;
create policy "Owners delete own card requests" on public.card_requests for delete to authenticated using (requester_id = auth.uid());
drop policy if exists "Participants read responses" on public.card_request_responses;
create policy "Participants read responses" on public.card_request_responses for select to authenticated using (responder_id = auth.uid() or exists(select 1 from public.card_requests r where r.id = request_id and r.requester_id = auth.uid()));
drop policy if exists "Members respond to open requests" on public.card_request_responses;
create policy "Members respond to open requests" on public.card_request_responses for insert to authenticated with check (responder_id = auth.uid() and exists(select 1 from public.card_requests r where r.id = request_id and r.status = 'open' and r.requester_id <> auth.uid()));
drop policy if exists "Participants read thread messages" on public.card_request_messages;
create policy "Participants read thread messages" on public.card_request_messages for select to authenticated using (exists(select 1 from public.card_request_responses x join public.card_requests r on r.id=x.request_id where x.id=response_id and (x.responder_id=auth.uid() or r.requester_id=auth.uid())));
drop policy if exists "Participants send thread messages" on public.card_request_messages;
create policy "Participants send thread messages" on public.card_request_messages for insert to authenticated with check (sender_id=auth.uid() and exists(select 1 from public.card_request_responses x join public.card_requests r on r.id=x.request_id where x.id=response_id and (x.responder_id=auth.uid() or r.requester_id=auth.uid())));
grant select, insert, update, delete on public.card_requests to authenticated;
grant select, insert on public.card_request_responses to authenticated;
grant select, insert on public.card_request_messages to authenticated;
