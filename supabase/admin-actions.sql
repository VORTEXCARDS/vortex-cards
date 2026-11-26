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


-- Additional guarded administrator operations.
create or replace function public.admin_issue_card(p_owner_id uuid, p_serial_number text)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_card_id uuid;
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if p_owner_id is null or not exists (select 1 from auth.users where id = p_owner_id) then
    raise exception 'Пользователь не найден';
  end if;
  if length(trim(coalesce(p_serial_number,''))) < 3 then raise exception 'Укажите серийный номер минимум из 3 символов'; end if;
  insert into public.card_inventory(serial_number, owner_id, status)
  values (trim(p_serial_number), p_owner_id, 'owned')
  returning id into v_card_id;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'card_issued', 'card', v_card_id, jsonb_build_object('owner_id',p_owner_id,'serial_number',trim(p_serial_number)));
  return jsonb_build_object('id',v_card_id,'serial_number',trim(p_serial_number));
end; $$;

create or replace function public.admin_set_card_retired(p_card_id uuid, p_retired boolean)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  update public.card_inventory
    set status = case when p_retired then 'retired' else 'owned' end,
        listing_id = case when p_retired then null else listing_id end,
        updated_at = now()
    where id = p_card_id and ((p_retired and status = 'owned') or (not p_retired and status = 'retired'));
  if not found then raise exception 'Карточка не найдена или её нельзя восстановить в текущем статусе'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_retired then 'card_retired' else 'card_restored' end,
          'card', p_card_id, '{}'::jsonb);
  return jsonb_build_object('id',p_card_id,'status',case when p_retired then 'retired' else 'owned' end);
end; $$;

create or replace function public.admin_cancel_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  update public.market_listings set status = 'cancelled'
    where id = p_listing_id and status = 'active';
  if not found then raise exception 'Активное объявление не найдено'; end if;
  update public.card_inventory set status = 'owned', listing_id = null, updated_at = now()
    where listing_id = p_listing_id and status = 'listed';
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'listing_cancelled', 'market_listing', p_listing_id, '{}'::jsonb);
  return jsonb_build_object('id',p_listing_id,'status','cancelled');
end; $$;

create or replace function public.admin_review_deposit(p_request_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if p_status not in ('detected','confirming','rejected','expired') then
    raise exception 'Разрешено только отметить обнаружение/подтверждение сети или отклонить заявку. Зачисление требует проверки платежа.';
  end if;
  update public.crypto_deposit_requests set status=p_status, admin_note=nullif(trim(coalesce(p_note,'')),''),
    updated_at=now()
    where id=p_request_id and status in ('pending','detected','confirming');
  if not found then raise exception 'Заявка не найдена или уже обработана'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'deposit_status_changed', 'crypto_deposit_request', p_request_id,
          jsonb_build_object('status',p_status,'note',p_note));
  return jsonb_build_object('id',p_request_id,'status',p_status);
end; $$;

create or replace function public.admin_review_withdrawal(p_request_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  if p_status not in ('under_review','rejected') then
    raise exception 'Для безопасности доступна только проверка или отклонение. Реальная выплата требует платёжного провайдера.';
  end if;
  update public.crypto_withdrawal_requests set status=p_status, admin_note=nullif(trim(coalesce(p_note,'')),''),
    updated_at=now()
    where id=p_request_id and status in ('pending','under_review');
  if not found then raise exception 'Заявка не найдена или уже обработана'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'withdrawal_status_changed', 'crypto_withdrawal_request', p_request_id,
          jsonb_build_object('status',p_status,'note',p_note));
  return jsonb_build_object('id',p_request_id,'status',p_status);
end; $$;

create or replace function public.admin_reject_exchange(p_request_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав администратора'; end if;
  update public.exchange_requests set status='rejected'
    where id=p_request_id and status in ('pending','quoted');
  if not found then raise exception 'Заявка не найдена или уже обработана'; end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'exchange_rejected', 'exchange_request', p_request_id,
          jsonb_build_object('note',p_note));
  return jsonb_build_object('id',p_request_id,'status','rejected');
end; $$;

revoke all on function public.admin_issue_card(uuid,text) from public;
revoke all on function public.admin_set_card_retired(uuid,boolean) from public;
revoke all on function public.admin_cancel_listing(uuid) from public;
revoke all on function public.admin_review_deposit(uuid,text,text) from public;
revoke all on function public.admin_review_withdrawal(uuid,text,text) from public;
revoke all on function public.admin_reject_exchange(uuid,text) from public;
grant execute on function public.admin_issue_card(uuid,text) to authenticated;
grant execute on function public.admin_set_card_retired(uuid,boolean) to authenticated;
grant execute on function public.admin_cancel_listing(uuid) to authenticated;
grant execute on function public.admin_review_deposit(uuid,text,text) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid,text,text) to authenticated;
grant execute on function public.admin_reject_exchange(uuid,text) to authenticated;


-- Marketplace listing lifecycle: lock listed cards against transfers and allow seller cancellation.
create or replace function public.create_market_listing(p_quantity integer, p_price numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_card_ids uuid[];
  v_count integer;
  v_listing_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Количество карточек должно быть от 1 до 100';
  end if;
  if p_price is null or p_price <= 0 then raise exception 'Цена должна быть больше нуля'; end if;

  select array_agg(id) into v_card_ids
  from (
    select id
    from public.card_inventory
    where owner_id = auth.uid() and status = 'owned'
    order by issued_at, id
    limit p_quantity
    for update
  ) available_cards;

  v_count := coalesce(array_length(v_card_ids, 1), 0);
  if v_count <> p_quantity then
    raise exception 'Недостаточно свободных карточек. Карточки в активных объявлениях нельзя выставить повторно или перевести.';
  end if;

  insert into public.market_listings(seller_id, quantity, price, status)
  values (auth.uid(), p_quantity, p_price, 'active')
  returning id into v_listing_id;

  update public.card_inventory
  set status = 'listed', listing_id = v_listing_id, updated_at = now()
  where id = any(v_card_ids) and owner_id = auth.uid() and status = 'owned';

  get diagnostics v_count = row_count;
  if v_count <> p_quantity then raise exception 'Не удалось закрепить все карточки за объявлением'; end if;

  return jsonb_build_object('listing_id', v_listing_id, 'quantity', v_count, 'status', 'active');
end;
$$;

create or replace function public.cancel_own_market_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_quantity integer;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт'; end if;

  select quantity into v_quantity
  from public.market_listings
  where id = p_listing_id and seller_id = auth.uid() and status = 'active'
  for update;

  if not found then raise exception 'Активное объявление не найдено или оно принадлежит другому пользователю'; end if;

  update public.market_listings
  set status = 'cancelled'
  where id = p_listing_id and seller_id = auth.uid() and status = 'active';

  update public.card_inventory
  set status = 'owned', listing_id = null, updated_at = now()
  where listing_id = p_listing_id and owner_id = auth.uid() and status = 'listed';

  return jsonb_build_object('listing_id', p_listing_id, 'status', 'cancelled', 'quantity_released', v_quantity);
end;
$$;

revoke all on function public.create_market_listing(integer, numeric) from public;
revoke all on function public.cancel_own_market_listing(uuid) from public;
grant execute on function public.create_market_listing(integer, numeric) to authenticated;
grant execute on function public.cancel_own_market_listing(uuid) to authenticated;
