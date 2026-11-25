-- La Tanière Coach — 0027 : bilans de progression envoyés par le coach au coaché.
-- Le contenu chiffré est calculé côté serveur au moment de l'envoi et figé dans `data`
-- (le bilan reste lisible tel qu'il a été envoyé, même si les séances changent ensuite).

create table if not exists public.progress_reports (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  title        text not null,
  data         jsonb not null default '{}'::jsonb,
  coach_note   text,
  sent_at      timestamptz not null default now(),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (period_end >= period_start),
  check (coach_note is null or char_length(coach_note) <= 2000)
);
create index if not exists progress_reports_client_idx on public.progress_reports (client_id, sent_at desc);

alter table public.progress_reports enable row level security;

drop policy if exists progress_reports_coach_all on public.progress_reports;
create policy progress_reports_coach_all on public.progress_reports for all to authenticated
  using (public.coach_owns_client(client_id))
  with check (public.coach_owns_client(client_id) and coach_id = auth.uid());

drop policy if exists progress_reports_self_select on public.progress_reports;
create policy progress_reports_self_select on public.progress_reports for select to authenticated
  using (client_id = public.my_client_id());

drop policy if exists progress_reports_self_read on public.progress_reports;
create policy progress_reports_self_read on public.progress_reports for update to authenticated
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- Un coaché ne peut que marquer son bilan comme lu.
create or replace function public.progress_reports_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.my_role() = 'coache' and (
       new.client_id is distinct from old.client_id or new.coach_id is distinct from old.coach_id
    or new.period_start is distinct from old.period_start or new.period_end is distinct from old.period_end
    or new.title is distinct from old.title or new.data is distinct from old.data
    or new.coach_note is distinct from old.coach_note or new.sent_at is distinct from old.sent_at) then
    raise exception 'Un coaché peut seulement marquer un bilan comme lu.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists progress_reports_guard on public.progress_reports;
create trigger progress_reports_guard before update on public.progress_reports
  for each row execute function public.progress_reports_guard();

grant select, insert, update, delete on public.progress_reports to authenticated;
