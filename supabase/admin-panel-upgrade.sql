-- VORTEXCARDS: secure administrator user directory
-- Run this entire file in Supabase SQL Editor as project owner.
-- The function exposes auth.users only to authenticated administrators.

-- Ensure the account moderation table exists even on older installations.
create table if not exists public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now()
);

alter table public.user_accounts enable row level security;
drop policy if exists "Users read own account status" on public.user_accounts;
create policy "Users read own account status"
  on public.user_accounts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.user_accounts from anon, authenticated;

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  username text,
  referral_code text,
  is_blocked boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_search text := lower(trim(coalesce(p_search, '')));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Недостаточно прав администратора';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    coalesce(u.raw_user_meta_data ->> 'username', '')::text,
    coalesce(u.raw_user_meta_data ->> 'referral_code', '')::text,
    coalesce(a.is_blocked, false)
  from auth.users u
  left join public.user_accounts a on a.user_id = u.id
  where v_search = ''
    or lower(coalesce(u.email, '')) like '%' || v_search || '%'
    or lower(coalesce(u.raw_user_meta_data ->> 'username', '')) like '%' || v_search || '%'
    or u.id::text ilike '%' || v_search || '%'
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_list_users(text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

-- Keep the admin role check callable through the authenticated Supabase API.
grant execute on function public.is_admin() to authenticated;

