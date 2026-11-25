-- La Tanière Coach — 0023 : séances en présentiel réparties sur la semaine, une heure fixe par coaché,
-- jamais deux coachés à la même heure (remplace demo_presentiel de 0022).

create or replace function public.demo_presentiel()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_coach uuid;
begin
  update public.subscriptions
     set coached_per_week = case plan_name when 'Suivi premium' then 2 else 1 end
   where true;

  -- Heure de rendez-vous propre à chaque coaché (créneaux de Karim : midi et soir, en semaine).
  with slots(rn, hhmm) as (
    values (1, '07:00'), (2, '12:00'), (3, '18:00'), (4, '19:00'), (5, '17:00'),
           (6, '08:00'), (7, '12:45'), (8, '20:00'), (9, '09:30'), (10, '13:45')
  ), cl as (
    select c.id, row_number() over (order by p.full_name) as rn
      from public.clients c join public.profiles p on p.id = c.profile_id
  ), wk as (
    select cs.id, cs.client_id, cs.date, cl.rn, s.coached_per_week,
           row_number() over (partition by cs.client_id, date_trunc('week', cs.date) order by cs.date) as k,
           count(*) over (partition by cs.client_id, date_trunc('week', cs.date)) as n
      from public.client_sessions cs
      join cl on cl.id = cs.client_id
      join public.subscriptions s on s.client_id = cs.client_id
  ), ranked as (
    -- décalage par coaché : les séances encadrées ne tombent pas toutes le même jour
    select wk.*, row_number() over (partition by wk.client_id, date_trunc('week', wk.date)
                                    order by ((wk.k - 1 + wk.rn) % wk.n)) as pick
      from wk
  )
  update public.client_sessions cs
     set mode = case when r.pick <= r.coached_per_week then 'presentiel' else 'solo' end,
         starts_at = case when r.pick <= r.coached_per_week
                          then ((r.date + (sl.hhmm)::time) at time zone 'Europe/Paris') end
    from ranked r join slots sl on sl.rn = ((r.rn - 1) % 10) + 1
   where cs.id = r.id;

  select id into v_coach from public.profiles where role = 'coach' order by created_at limit 1;
  if v_coach is not null and not exists (select 1 from public.recipes where name = 'Poulet, riz et ratatouille') then
    insert into public.recipes (coach_id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, ingredients, steps, tags)
    values (v_coach, 'Poulet, riz et ratatouille', 1, 640, 50, 63, 19,
      '[{"aliment": "Blanc de poulet cuit", "quantite": "150 g"},
        {"aliment": "Riz basmati cuit", "quantite": "180 g"},
        {"aliment": "Ratatouille (courgette, aubergine, poivron, tomate)", "quantite": "200 g"},
        {"aliment": "Huile d''olive", "quantite": "7 g"}]'::jsonb,
      'Cuire le riz. Saisir le poulet en lamelles 6 à 8 min. Réchauffer la ratatouille avec l''huile d''olive, servir le tout dans une assiette. Se prépare la veille en boîte.',
      array['déjeuner', 'dîner', 'prise de force', 'batch cooking']);
  end if;
end $$;
revoke all on function public.demo_presentiel() from public, anon, authenticated;
select public.demo_presentiel();
