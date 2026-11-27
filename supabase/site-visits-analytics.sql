-- VORTEXCARDS: privacy-conscious website visit analytics
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  path text not null default '/',
  session_id uuid not null,
  language text not null default 'ru'
    check (language in ('uk','ru','en','de','fr'))
);

create index if not exists site_visits_visited_at_idx
  on public.site_visits (visited_at desc);
create index if not exists site_visits_session_id_idx
  on public.site_visits (session_id);

alter table public.site_visits enable row level security;

drop policy if exists "Anyone can record anonymous site visits" on public.site_visits;
create policy "Anyone can record anonymous site visits"
  on public.site_visits for insert
  to anon, authenticated
  with check (
    length(path) <= 500
    and language in ('uk','ru','en','de','fr')
  );

drop policy if exists "Admins can read site visit analytics" on public.site_visits;
create policy "Admins can read site visit analytics"
  on public.site_visits for select
  to authenticated
  using (public.is_admin());


-- Explicit API privileges; row-level security still limits what each role can do.
grant usage on schema public to anon, authenticated;
grant insert on table public.site_visits to anon, authenticated;
grant select on table public.site_visits to authenticated;

-- Refresh PostgREST's schema cache so the table becomes visible to the app.
notify pgrst, 'reload schema';
