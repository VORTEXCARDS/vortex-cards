-- VORTEXCARDS: unique usernames for new registrations
-- Names are compared case-insensitively, so Vortex and vortex are the same name.

do $$
begin
  if exists (
    select 1
    from public.user_profiles
    where username is not null and btrim(username) <> ''
    group by lower(btrim(username))
    having count(*) > 1
  ) then
    raise exception 'В user_profiles уже есть повторяющиеся имена пользователей. Сначала устраните дубликаты, затем повторите настройку.';
  end if;
end;
$$;

create unique index if not exists user_profiles_username_unique_lower_idx
  on public.user_profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');

  if v_username is not null then
    if char_length(v_username) < 2 or char_length(v_username) > 24 then
      raise exception 'Имя пользователя должно содержать от 2 до 24 символов.';
    end if;


    insert into public.user_profiles (user_id, username, avatar_url, updated_at)
    values (new.id, v_username, null, now());
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.create_profile_for_new_auth_user();

revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;

notify pgrst, 'reload schema';
