-- La Tanière Coach — 0024 : « Réinitialiser la démo » depuis l'app.
-- PostgREST charge pg-safeupdate (DELETE/UPDATE sans WHERE refusés) et interdit de le désactiver.
-- Seule instruction concernée : « delete from demo_map; » dans seed_demo → « where true ».
do $$
begin
  execute replace(pg_get_functiondef('public.seed_demo()'::regprocedure),
                  'delete from demo_map;', 'delete from demo_map where true;');
end $$;

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
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;
