-- VORTEX UNIT: cryptocurrency denomination for marketplace listings
-- Run once in Supabase SQL Editor as project owner.
-- Supported assets: USDT, BTC, ETH, TON, USDC. VTX is intentionally excluded.
-- Existing listings without an asset code are not displayed until they are relisted.

create table if not exists public.market_listing_currencies (
  listing_id uuid primary key references public.market_listings(id) on delete cascade,
  asset_code text not null check (asset_code in ('USDT','BTC','ETH','TON','USDC')),
  created_at timestamptz not null default now()
);

alter table public.market_listing_currencies enable row level security;

drop policy if exists "Public can read active listing currencies" on public.market_listing_currencies;
create policy "Public can read active listing currencies"
  on public.market_listing_currencies
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.market_listings ml
      where ml.id = listing_id and ml.status = 'active'
    )
  );

revoke insert, update, delete on public.market_listing_currencies from anon, authenticated;

create or replace function public.create_market_listing_with_currency(
  p_quantity integer,
  p_price numeric,
  p_asset_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Необходимо войти в аккаунт.';
  end if;

  if p_asset_code not in ('USDT','BTC','ETH','TON','USDC') then
    raise exception 'Недопустимая криптовалюта.';
  end if;

  -- Serialize new listings per seller so the currency is attached to the listing just created.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  perform public.create_market_listing(p_quantity, p_price);

  select ml.id
    into v_listing_id
    from public.market_listings ml
   where ml.seller_id = auth.uid()
     and ml.status = 'active'
     and ml.created_at >= transaction_timestamp()
   order by ml.created_at desc, ml.id desc
   limit 1;

  if v_listing_id is null then
    raise exception 'Не удалось определить созданное объявление.';
  end if;

  insert into public.market_listing_currencies (listing_id, asset_code)
  values (v_listing_id, p_asset_code)
  on conflict (listing_id) do update set asset_code = excluded.asset_code;

  return jsonb_build_object('quantity', p_quantity, 'listing_id', v_listing_id, 'asset_code', p_asset_code);
end;
$$;

revoke all on function public.create_market_listing_with_currency(integer, numeric, text) from public;
grant execute on function public.create_market_listing_with_currency(integer, numeric, text) to authenticated;
