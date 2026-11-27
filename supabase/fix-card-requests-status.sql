-- VORTEX UNIT: allow the request statuses used by the application.
-- Run once in Supabase SQL Editor.
alter table public.card_requests
  alter column status set default 'open';

alter table public.card_requests
  drop constraint if exists card_requests_status_check;

alter table public.card_requests
  add constraint card_requests_status_check
  check (status in ('open', 'closed', 'fulfilled', 'deleted'));
