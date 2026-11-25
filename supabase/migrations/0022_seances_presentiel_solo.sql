-- La Tanière Coach — 0022 : séances encadrées (présentiel avec Karim) et séances en autonomie
-- Retour client du 25/11 : on doit comprendre dans l'appli que Karim fait certaines séances
-- en présentiel avec ses coachés (selon la formule : 1 ou 2 par semaine) et que les autres
-- sont faites en solo, avec le suivi à distance. Agenda de Karim plus rempli.
-- Ajout aussi de la recette « Poulet, riz et ratatouille ».

alter table public.subscriptions
  add column if not exists coached_per_week smallint not null default 1
  check (coached_per_week between 0 and 7);
comment on column public.subscriptions.coached_per_week is
  'Séances encadrées en présentiel avec le coach, par semaine, incluses dans la formule.';

alter table public.client_sessions
  add column if not exists mode text not null default 'solo' check (mode in ('presentiel', 'solo')),
  add column if not exists starts_at timestamptz;
comment on column public.client_sessions.mode is 'presentiel : séance encadrée par le coach à la salle ; solo : en autonomie.';
comment on column public.client_sessions.starts_at is 'Heure de rendez-vous pour une séance en présentiel.';

create index if not exists client_sessions_presentiel_idx
  on public.client_sessions (starts_at) where mode = 'presentiel';

-- Garde-fou : un coaché ne peut pas changer le mode ni l'heure d'une séance.
create or replace function public.client_sessions_guard_mode() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.my_role() = 'coache'
     and (new.mode is distinct from old.mode or new.starts_at is distinct from old.starts_at) then
    raise exception 'Seul le coach peut planifier une séance en présentiel.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists client_sessions_guard_mode on public.client_sessions;
create trigger client_sessions_guard_mode before update on public.client_sessions
  for each row execute function public.client_sessions_guard_mode();

-- Données de démo : formules, séances encadrées, recette.
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
    values (1, '07:30'), (2, '12:15'), (3, '18:00'), (4, '19:15'), (5, '12:15'),
           (6, '18:00'), (7, '07:30'), (8, '19:15'), (9, '17:00'), (10, '20:00')
  ), cl as (
    select c.id, row_number() over (order by p.full_name) as rn
      from public.clients c join public.profiles p on p.id = c.profile_id
  ), ranked as (
    select cs.id, cs.date, cl.rn, s.coached_per_week,
           row_number() over (partition by cs.client_id, date_trunc('week', cs.date) order by cs.date) as k
      from public.client_sessions cs
      join cl on cl.id = cs.client_id
      join public.subscriptions s on s.client_id = cs.client_id
  )
  update public.client_sessions cs
     set mode = case when r.k <= r.coached_per_week then 'presentiel' else 'solo' end,
         starts_at = case when r.k <= r.coached_per_week
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

-- 0021 (séance du jour de Léa, safeupdate) + 0022 enchaînés dans la réinitialisation.
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
  perform public.demo_presentiel();
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;

select public.demo_presentiel();
