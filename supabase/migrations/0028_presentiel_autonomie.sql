-- La Tanière Coach — 0028 : une semaine garde toujours la part « en autonomie » prévue par la formule
-- (Suivi premium = 3 séances dont 2 encadrées ; une semaine à 2 séances donne 1 encadrée + 1 en autonomie).
do $$
declare d text := pg_get_functiondef('public.demo_presentiel()'::regprocedure);
begin
  d := replace(d, 'select c.id, row_number() over (order by p.full_name) as rn',
                  'select c.id, c.sessions_per_week as spw, row_number() over (order by p.full_name) as rn');
  d := replace(d, 'select cs.id, cs.client_id, cs.date, cl.rn, s.coached_per_week,',
                  'select cs.id, cs.client_id, cs.date, cl.rn, cl.spw, s.coached_per_week,');
  d := replace(d, 'when r.pick <= r.coached_per_week',
                  'when r.pick <= least(r.coached_per_week, greatest(r.n - greatest(coalesce(r.spw, r.n) - r.coached_per_week, 0), 1))');
  if d not like '%cl.spw%' or d not like '%least(r.coached_per_week%' then
    raise exception 'demo_presentiel : remplacement impossible';
  end if;
  execute d;
end $$;

-- Semaine de la démo : la séance faite plus tôt dans la semaine est l'encadrée (17:00), celle du jour en autonomie.
create or replace function public.demo_lea_solo()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_client uuid;
begin
  select c.id into v_client from public.clients c join public.profiles p on p.id = c.profile_id
   where p.full_name = 'Léa Martin' limit 1;
  if v_client is null then return; end if;
  update public.client_sessions set mode = 'solo', starts_at = null
   where client_id = v_client and date = current_date and status = 'planned';
  update public.client_sessions
     set mode = 'presentiel', starts_at = ((date + time '17:00') at time zone 'Europe/Paris')
   where client_id = v_client and date >= date_trunc('week', current_date)::date and date < current_date;
end $$;
revoke all on function public.demo_lea_solo() from public, anon, authenticated;
select public.demo_lea_solo();
