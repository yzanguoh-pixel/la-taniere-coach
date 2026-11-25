-- La Tanière Coach — 0026 : pour la démo, la séance du jour de Léa se fait en autonomie
-- (elle note ses séries seule, envoie son retour, Karim ajuste à distance) ; lundi était encadrée.
create or replace function public.demo_lea_solo()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.client_sessions cs
     set mode = 'solo', starts_at = null
    from public.clients c join public.profiles p on p.id = c.profile_id
   where cs.client_id = c.id and p.full_name = 'Léa Martin'
     and cs.date = current_date and cs.status = 'planned';
end $$;
revoke all on function public.demo_lea_solo() from public, anon, authenticated;

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
  perform public.demo_presentiel();
  perform public.demo_lea_solo();
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;

select public.demo_lea_solo();
