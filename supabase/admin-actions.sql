-- VORTEXCARDS: secure actions for user cards and administrator moderation.
-- Run this file once in Supabase SQL Editor. These functions do not process fiat or crypto payments.

create or replace function public.transfer_cards(p_recipient_email text, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_recipient uuid;
  v_card_ids uuid[];
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Количество должно быть от 1 до 100';
  end if;
  if p_recipient_email is null or length(trim(p_recipient_email)) < 5 then
    raise exception 'Укажите email получателя';
  end if;

  select id into v_recipient
  from auth.users
  where lower(email) = lower(trim(p_recipient_email))
  limit 1;

  if v_recipient is null then raise exception 'Пользователь с таким email не найден'; end if;
  if v_recipient = auth.uid() then raise exception 'Нельзя передать карточки самому себе'; end if;

  select array_agg(id) into v_card_ids
  from (
    select id
    from public.card_inventory
    where owner_id = auth.uid() and status = 'owned'
    order by issued_at, id
    limit p_quantity
    for update
  ) owned_cards;

  v_count := coalesce(array_length(v_card_ids, 1), 0);
  if v_count <> p_quantity then raise exception 'Недостаточно свободных карточек'; end if;

  update public.card_inventory
  set owner_id = v_recipient, updated_at = now()
  where id = any(v_card_ids) and owner_id = auth.uid() and status = 'owned';

  return jsonb_build_object('transferred', v_count);
end;
$$;

create or replace function public.admin_set_user_block(p_user_id uuid, p_blocked boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'Нельзя изменить собственный аккаунт'; end if;
  insert into public.user_accounts(user_id, is_blocked, block_reason)
  values (p_user_id, p_blocked, case when p_blocked then nullif(trim(coalesce(p_reason,'')), '') else null end)
  on conflict (user_id) do update
    set is_blocked = excluded.is_blocked, block_reason = excluded.block_reason;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_blocked then 'user_blocked' else 'user_unblocked' end,
          'user', p_user_id, jsonb_build_object('reason', p_reason));
  return jsonb_build_object('user_id', p_user_id, 'is_blocked', p_blocked);
end;
$$;

create or replace function public.admin_resolve_complaint(p_complaint_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  update public.complaints set status = 'resolved'
  where id = p_complaint_id;
  if not found then raise exception 'Жалоба не найдена'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'complaint_resolved', 'complaint', p_complaint_id, '{}'::jsonb);
  return jsonb_build_object('id', p_complaint_id, 'status', 'resolved');
end;
$$;

create or replace function public.admin_resolve_dispute(p_dispute_id uuid, p_resolution text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if length(trim(coalesce(p_resolution,''))) < 3 then raise exception 'Укажите решение спора'; end if;
  update public.disputes set status = 'resolved', resolution = trim(p_resolution)
  where id = p_dispute_id;
  if not found then raise exception 'Спор не найден'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'dispute_resolved', 'dispute', p_dispute_id,
          jsonb_build_object('resolution', trim(p_resolution)));
  return jsonb_build_object('id', p_dispute_id, 'status', 'resolved');
end;
$$;

create or replace function public.admin_review_buyback(p_request_id uuid, p_approved boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  update public.buyback_requests
  set status = case when p_approved then 'approved' else 'rejected' end,
      admin_note = nullif(trim(coalesce(p_note,'')), '')
  where id = p_request_id;
  if not found then raise exception 'Заявка на выкуп не найдена'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_approved then 'buyback_approved' else 'buyback_rejected' end,
          'buyback_request', p_request_id, jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_request_id, 'status', case when p_approved then 'approved' else 'rejected' end);
end;
$$;

revoke all on function public.transfer_cards(text, integer) from public;
revoke all on function public.admin_set_user_block(uuid, boolean, text) from public;
revoke all on function public.admin_resolve_complaint(uuid) from public;
revoke all on function public.admin_resolve_dispute(uuid, text) from public;
revoke all on function public.admin_review_buyback(uuid, boolean, text) from public;

grant execute on function public.transfer_cards(text, integer) to authenticated;
grant execute on function public.admin_set_user_block(uuid, boolean, text) to authenticated;
grant execute on function public.admin_resolve_complaint(uuid) to authenticated;
grant execute on function public.admin_resolve_dispute(uuid, text) to authenticated;
grant execute on function public.admin_review_buyback(uuid, boolean, text) to authenticated;
