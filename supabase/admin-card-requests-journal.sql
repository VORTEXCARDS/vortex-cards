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
