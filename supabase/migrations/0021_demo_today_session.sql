-- La Tanière Coach — 0021 : après réinitialisation, Léa a toujours une séance « du jour » à faire
-- (le seed calcule les dates par jour de semaine ; selon le jour de la soutenance, il n'y en avait pas).
-- Corrige aussi l'échec de « Réinitialiser la démo » depuis l'app (HTTP 400) : PostgREST charge
-- pg-safeupdate, qui refuse UPDATE/DELETE sans WHERE ; on le désactive le temps de la réinitialisation.
create or replace function public.demo_fixups()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_client uuid;
begin
  update public.availability_slots
     set starts_at = (starts_at at time zone 'UTC') at time zone 'Europe/Paris',
         ends_at   = (ends_at   at time zone 'UTC') at time zone 'Europe/Paris'
   where true;
  update public.bookings
     set starts_at = (starts_at at time zone 'UTC') at time zone 'Europe/Paris'
   where true;

  select c.id into v_client from public.clients c join public.profiles p on p.id = c.profile_id
   where p.full_name = 'Léa Martin' limit 1;
  if v_client is null then return; end if;

  update public.subscriptions set renews_on = current_date + 5 where client_id = v_client;

  if not exists (select 1 from public.client_sessions
                  where client_id = v_client and date = current_date and status = 'planned') then
    update public.client_sessions set date = current_date
     where id = (select id from public.client_sessions
                  where client_id = v_client and status = 'planned' and date > current_date
                  order by date limit 1);
  end if;
end $$;
revoke all on function public.demo_fixups() from public, anon, authenticated;

create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_coach() then
    raise exception 'Seul le coach peut réinitialiser la démo.' using errcode = '42501';
  end if;
  perform set_config('safeupdate.enabled', '0', true);
  perform public.seed_demo();
  delete from auth.users where raw_user_meta_data ? 'converted_from_booking';
  perform public.demo_fixups();
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;

-- Séance de Léa ramenée à aujourd'hui pour les données actuelles.
update public.client_sessions set date = current_date
 where id = (select cs.id from public.client_sessions cs join public.clients c on c.id = cs.client_id
              join public.profiles p on p.id = c.profile_id
             where p.full_name = 'Léa Martin' and cs.status = 'planned' and cs.date > current_date
             order by cs.date limit 1);
