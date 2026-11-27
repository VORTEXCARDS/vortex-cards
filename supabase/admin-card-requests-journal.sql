-- VORTEXCARDS: allow administrators to read all card request announcements.
-- Run this file in Supabase SQL Editor.
-- Regular users retain the existing privacy rules; this adds a separate admin-only read policy.

alter table public.card_requests enable row level security;

drop policy if exists "Admins read all card requests" on public.card_requests;

create policy "Admins read all card requests"
on public.card_requests
for select
to authenticated
using (public.is_admin());

grant select on public.card_requests to authenticated;


-- Permanently remove an inappropriate wanted-card announcement.
-- The full announcement snapshot is written to admin_audit_log first.
create or replace function public.admin_delete_card_request(
  p_request_id uuid,
  p_reason text default 'Нарушение правил сайта'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.card_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав администратора';
  end if;

  if p_request_id is null then
    raise exception 'Не указано объявление для удаления';
  end if;

  select * into v_request
  from public.card_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Объявление не найдено или уже удалено';
  end if;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'card_request_deleted',
    'card_request',
    v_request.id,
    jsonb_build_object(
      'requester_id', v_request.requester_id,
      'card_number', v_request.card_number,
      'quantity', v_request.quantity,
      'desired_price', v_request.desired_price,
      'asset_code', v_request.asset_code,
      'details', v_request.details,
      'status', v_request.status,
      'created_at', v_request.created_at,
      'reason', coalesce(nullif(trim(p_reason), ''), 'Нарушение правил сайта')
    )
  );

  delete from public.card_requests where id = v_request.id;

  return jsonb_build_object('id', v_request.id, 'deleted', true);
end;
$$;

revoke all on function public.admin_delete_card_request(uuid, text) from public;
grant execute on function public.admin_delete_card_request(uuid, text) to authenticated;
