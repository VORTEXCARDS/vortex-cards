-- VORTEXCARDS GAMES: server-verified code game and unique card rewards
-- Run once in Supabase SQL Editor as project owner.
-- Reward serials are held separately until won; existing owned cards are never moved.

create table if not exists public.vortex_game_reward_pool (
  serial_number text primary key,
  added_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  constraint vortex_game_reward_serial_format check (
    serial_number ~ '^[0-9]{4}$'
    and length(regexp_replace(serial_number, '([0-9]).*', '\1', 'g')) > 0
  )
);

-- Enforce four different digits (including leading zeroes).
alter table public.vortex_game_reward_pool
  drop constraint if exists vortex_game_reward_unique_digits;
alter table public.vortex_game_reward_pool
  add constraint vortex_game_reward_unique_digits
  check (length(serial_number) = 4
    and substr(serial_number,1,1) <> substr(serial_number,2,1)
    and substr(serial_number,1,1) <> substr(serial_number,3,1)
    and substr(serial_number,1,1) <> substr(serial_number,4,1)
    and substr(serial_number,2,1) <> substr(serial_number,3,1)
    and substr(serial_number,2,1) <> substr(serial_number,4,1)
    and substr(serial_number,3,1) <> substr(serial_number,4,1));

create table if not exists public.vortex_game_code_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_serial text not null,
  attempts integer not null default 0 check (attempts between 0 and 8),
  status text not null default 'playing' check (status in ('playing','won','lost','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  reward_serial text
);
create index if not exists vortex_game_sessions_user_created
  on public.vortex_game_code_sessions(user_id, created_at desc);

create table if not exists public.vortex_game_points (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  session_id uuid references public.vortex_game_code_sessions(id) on delete set null,
  points integer not null check (points > 0),
  reason text not null check (reason in ('code_game_win')),
  created_at timestamptz not null default now(),
  unique(session_id, reason)
);
create index if not exists vortex_game_points_user_created
  on public.vortex_game_points(user_id, created_at desc);

alter table public.vortex_game_reward_pool enable row level security;
alter table public.vortex_game_code_sessions enable row level security;
alter table public.vortex_game_points enable row level security;

drop policy if exists "Users read own game points" on public.vortex_game_points;
create policy "Users read own game points" on public.vortex_game_points
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

revoke all on public.vortex_game_reward_pool from anon, authenticated;
revoke all on public.vortex_game_code_sessions from anon, authenticated;
revoke insert, update, delete on public.vortex_game_points from anon, authenticated;
grant select on public.vortex_game_points to authenticated;

create or replace function public.admin_add_game_reward(p_serial_number text)
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare v_serial text := trim(coalesce(p_serial_number,''));
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if v_serial !~ '^[0-9]{4}$'
    or substr(v_serial,1,1)=substr(v_serial,2,1)
    or substr(v_serial,1,1)=substr(v_serial,3,1)
    or substr(v_serial,1,1)=substr(v_serial,4,1)
    or substr(v_serial,2,1)=substr(v_serial,3,1)
    or substr(v_serial,2,1)=substr(v_serial,4,1)
    or substr(v_serial,3,1)=substr(v_serial,4,1) then
    raise exception 'Нужен номер из четырёх разных цифр';
  end if;
  if exists(select 1 from public.card_inventory where serial_number=v_serial)
    then raise exception 'Этот номер уже существует в коллекции'; end if;
  insert into public.vortex_game_reward_pool(serial_number) values(v_serial);
  return jsonb_build_object('serial_number',v_serial,'status','available');
end;
$$;

create or replace function public.game_start_code()
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare v_serial text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Войди в аккаунт'; end if;
  select serial_number into v_serial
  from public.vortex_game_reward_pool
  where claimed_at is null
    and not exists(select 1 from public.card_inventory c where c.serial_number=vortex_game_reward_pool.serial_number)
  order by random()
  limit 1
  for update skip locked;
  if v_serial is null then raise exception 'Нет свободных игровых карточек. Попробуй позже'; end if;
  insert into public.vortex_game_code_sessions(user_id,secret_serial)
  values(auth.uid(),v_serial) returning id into v_id;
  return jsonb_build_object('session_id',v_id,'attempts_allowed',8);
end;
$$;

create or replace function public.game_submit_code(p_session_id uuid, p_guess text)
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_game public.vortex_game_code_sessions%rowtype;
  v_guess text := trim(coalesce(p_guess,''));
  v_exact integer;
  v_present integer;
  v_points integer;
  v_card_id uuid;
begin
  if auth.uid() is null then raise exception 'Войди в аккаунт'; end if;
  if v_guess !~ '^[0-9]{4}$'
    or substr(v_guess,1,1)=substr(v_guess,2,1)
    or substr(v_guess,1,1)=substr(v_guess,3,1)
    or substr(v_guess,1,1)=substr(v_guess,4,1)
    or substr(v_guess,2,1)=substr(v_guess,3,1)
    or substr(v_guess,2,1)=substr(v_guess,4,1)
    or substr(v_guess,3,1)=substr(v_guess,4,1) then
    raise exception 'Введи четыре разные цифры';
  end if;

  select * into v_game from public.vortex_game_code_sessions
  where id=p_session_id and user_id=auth.uid()
  for update;
  if not found then raise exception 'Игровая сессия не найдена'; end if;
  if v_game.status <> 'playing' then raise exception 'Эта игра уже завершена'; end if;
  if now() > v_game.expires_at then
    update public.vortex_game_code_sessions set status='expired',completed_at=now() where id=v_game.id;
    raise exception 'Время игры истекло. Начни новую игру'; 
  end if;
  if v_game.attempts >= 8 then raise exception 'Попытки закончились'; end if;

  select count(*) into v_exact
  from generate_series(1,4) n
  where substr(v_guess,n,1)=substr(v_game.secret_serial,n,1);
  select count(*) into v_present
  from generate_series(1,4) n
  where position(substr(v_guess,n,1) in v_game.secret_serial)>0;
  v_present := v_present-v_exact;

  update public.vortex_game_code_sessions
  set attempts=attempts+1
  where id=v_game.id;

  if v_exact=4 then
    v_points := greatest(20,100-v_game.attempts*10);
    update public.vortex_game_reward_pool
      set claimed_by=auth.uid(),claimed_at=now()
      where serial_number=v_game.secret_serial and claimed_at is null;
    if not found then raise exception 'Эта карточка уже выиграна. Начни новую игру'; end if;

    insert into public.card_inventory(serial_number,owner_id,status)
    values(v_game.secret_serial,auth.uid(),'owned')
    returning id into v_card_id;

    update public.vortex_game_code_sessions
      set status='won',completed_at=now(),reward_serial=v_game.secret_serial
      where id=v_game.id;
    insert into public.vortex_game_points(user_id,session_id,points,reason)
      values(auth.uid(),v_game.id,v_points,'code_game_win');
    return jsonb_build_object('status','won','exact',v_exact,'present',v_present,
      'serial_number',v_game.secret_serial,'card_id',v_card_id,'points_awarded',v_points,
      'attempts_used',v_game.attempts+1);
  elsif v_game.attempts+1 >= 8 then
    update public.vortex_game_code_sessions set status='lost',completed_at=now() where id=v_game.id;
    return jsonb_build_object('status','lost','exact',v_exact,'present',v_present,'attempts_used',8);
  end if;
  return jsonb_build_object('status','playing','exact',v_exact,'present',v_present,
    'attempts_used',v_game.attempts+1,'attempts_left',7-v_game.attempts);
end;
$$;

revoke all on function public.admin_add_game_reward(text) from public, anon;
revoke all on function public.game_start_code() from public, anon;
revoke all on function public.game_submit_code(uuid,text) from public, anon;
grant execute on function public.admin_add_game_reward(text) to authenticated;
grant execute on function public.game_start_code() to authenticated;
grant execute on function public.game_submit_code(uuid,text) to authenticated;

-- After running this script, add the serial numbers reserved for prizes:
-- select public.admin_add_game_reward('5831');
-- select public.admin_add_game_reward('7264');
-- Use only numbers that have not already been issued or promised elsewhere.
