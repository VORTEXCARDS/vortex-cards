-- VORTEX UNIT: self-service account deletion.
-- Run once in the Supabase SQL Editor as project owner.
-- Calling delete_my_account() removes the signed-in auth user and rows in public
-- tables that have a foreign key to auth.users. Related rows configured with
-- ON DELETE CASCADE are removed by PostgreSQL as well.

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid;
  v_fk record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Для удаления аккаунта необходимо войти в систему';
  end if;

  -- Remove direct references first. Tables with fewer dependent tables are
  -- processed earlier, reducing conflicts with restrictive foreign keys.
  for v_fk in
    select
      ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name,
      (
        select count(*)
        from pg_catalog.pg_constraint child_fk
        where child_fk.contype = 'f'
          and child_fk.confrelid = rel.oid
      ) as dependent_count
    from pg_catalog.pg_constraint fk
    join pg_catalog.pg_class rel on rel.oid = fk.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = rel.relnamespace
    join pg_catalog.pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = fk.conkey[1]
    where fk.contype = 'f'
      and fk.confrelid = 'auth.users'::pg_catalog.regclass
      and ns.nspname = 'public'
      and pg_catalog.cardinality(fk.conkey) = 1
    order by dependent_count asc, ns.nspname, rel.relname
  loop
    execute pg_catalog.format(
      'delete from %I.%I where %I = $1',
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.column_name
    ) using v_user_id;
  end loop;

  delete from auth.users where id = v_user_id;

  if not found then
    raise exception 'Аккаунт не найден или уже удалён';
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'message', 'Account and linked records deleted'
  );
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
