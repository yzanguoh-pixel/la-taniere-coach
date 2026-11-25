-- La Tanière Coach — 0020 : corrections pour la soutenance (aucune nouvelle fonctionnalité)
-- 1. Les créneaux du seed étaient écrits en UTC (12:30 s'affichait 13:30 à Paris) :
--    on réinterprète l'heure du seed comme une heure de Paris.
-- 2. Un prospect converti crée un compte auth ; reset_demo ne le supprimait pas, donc une
--    deuxième répétition de « Convertir » échouait (« Un compte existe déjà »).
-- 3. L'échéance de Léa est rapprochée (J-5) pour que le rappel J-7 soit montrable.

create or replace function public.demo_fixups()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.availability_slots
     set starts_at = (starts_at at time zone 'UTC') at time zone 'Europe/Paris',
         ends_at   = (ends_at   at time zone 'UTC') at time zone 'Europe/Paris';
  update public.bookings
     set starts_at = (starts_at at time zone 'UTC') at time zone 'Europe/Paris';
  update public.subscriptions s
     set renews_on = current_date + 5
    from public.clients c join public.profiles p on p.id = c.profile_id
   where s.client_id = c.id and p.full_name = 'Léa Martin';
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
  perform public.seed_demo();
  delete from auth.users where raw_user_meta_data ? 'converted_from_booking';
  perform public.demo_fixups();
end $$;

revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;

-- Remise à plat immédiate des données actuelles.
select public.seed_demo();
delete from auth.users where raw_user_meta_data ? 'converted_from_booking';
select public.demo_fixups();
