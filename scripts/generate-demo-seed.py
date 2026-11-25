# -*- coding: utf-8 -*-
"""Génère supabase/migrations/0003_demo_seed.sql : fonctions seed_demo() et reset_demo().

Usage : python3 scripts/generate-demo-seed.py
Les catalogues sont dans scripts/demo_data.py. Les dates sont relatives au jour de l'appel
(la démo reste « fraîche » à chaque reset_demo()).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from demo_data import EXERCISES, FOODS, TEMPLATES, MEAL_PLANS, RECIPES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'supabase', 'migrations', '0003_demo_seed.sql')


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def arr(xs):
    return "array[" + ",".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"


def js(o):
    return q(json.dumps(o, ensure_ascii=False)) + '::jsonb'


FOOD = {f[0]: f for f in FOODS}

# Coachés : clé, nom, initiales, objectif, niveau, séances/sem, blessures, poids, exclusions, canal, objectifs chiffrés, modèle
COACHES = [
    ('lea', 'Léa Martin', 'LM', 'Prise de force, objectif squat 70 kg', 'intermediaire', 3, 'Genou gauche sensible en descente', 62, [], 'app', {'squat_kg': 70}, 'Force bas du corps'),
    ('tom', 'Tom Bernard', 'TB', 'Remise en forme après deux ans d’arrêt', 'debutant', 2, 'Genou droit fragile', 84, [], 'whatsapp', {}, 'Full body débutant'),
    ('yanis', 'Yanis Saïdi', 'YS', 'Prise de muscle', 'intermediaire', 4, None, 71, [], 'whatsapp', {'poids_kg': 75}, 'Hypertrophie haut / bas'),
    ('ines', 'Inès Kaci', 'IK', 'Perte de poids durable', 'debutant', 3, None, 78, [], 'app', {'poids_kg': 70}, 'HIIT + renforcement'),
    ('hugo', 'Hugo Lefèvre', 'HL', 'Courir un semi-marathon en moins de 1 h 50', 'intermediaire', 3, 'Tendinite d’Achille ancienne', 70, [], 'whatsapp', {'semi': '1:50'}, 'Course semi-marathon'),
    ('camille', 'Camille Roux', 'CR', 'Mobilité et dos sans douleur', 'debutant', 2, 'Lombalgie chronique', 58, [], 'app', {}, 'Mobilité et dos'),
    ('sarah', 'Sarah Petit', 'SP', 'Retrouver de l’énergie et mieux manger', 'debutant', 2, None, 64, ['poisson'], 'app', {}, 'Full body débutant'),
    ('malik', 'Malik Diallo', 'MD', 'Terminer un Hyrox en moins de 1 h 30', 'confirme', 5, None, 82, [], 'app', {'hyrox': '1:30'}, 'Hyrox'),
    ('julie', 'Julie Moreau', 'JM', 'Tonification et régularité', 'debutant', 3, None, 60, ['lactose'], 'app', {}, 'Full body débutant'),
    ('theo', 'Théo Garnier', 'TG', 'Force athlétique', 'confirme', 4, 'Épaule droite à surveiller', 90, [], 'whatsapp', {'squat_kg': 180}, 'Hypertrophie haut / bas'),
]

# Retours de séance (clé coaché, rpe, ressenti, zone de douleur, note, traité ?)
FEEDBACK = [
    ('lea', 6, 'facile', None, "Squat facile, j'aurais pu mettre +5 kg", False),
    ('tom', 7, 'douleur', 'genou droit', 'Gêne au genou droit sur les fentes, j’ai arrêté à la 2e série.', False),
    ('yanis', 9, 'difficile', None, 'Développé couché trop lourd, je n’ai pas fini la dernière série.', False),
    ('ines', 5, 'facile', None, 'Circuit trop facile, je peux monter.', False),
    ('hugo', 7, 'correct', None, 'Sortie longue OK, tendon RAS.', False),
    ('malik', 8, 'correct', None, 'Wall balls difficiles mais terminés.', True),
    ('camille', 4, 'correct', None, 'Dos détendu après la séance.', True),
    ('julie', 6, 'correct', None, 'Bonne séance.', True),
    ('theo', 8, 'correct', None, 'Squat solide.', True),
]

# Journal nutrition de Léa le lundi : 1 276 kcal pour un objectif de 2 100 kcal
LEA_LOG = [('petit_dejeuner', "Flocons d'avoine", 50), ('petit_dejeuner', 'Lait demi-écrémé', 200), ('petit_dejeuner', 'Banane', 120),
           ('dejeuner', 'Riz basmati cuit', 150), ('dejeuner', 'Blanc de poulet cuit', 120), ('dejeuner', 'Brocoli cuit', 150),
           ('dejeuner', "Huile d'olive", 5), ('collation', 'Skyr nature', 150)]
TARGET = 1276


def log_rows():
    rows, total = [], 0.0
    for meal, name, g in LEA_LOG:
        f = FOOD[name]; k = round(f[2] * g / 100, 1); total += k
        rows.append((meal, name, g, k, round(f[3] * g / 100, 1), round(f[4] * g / 100, 1), round(f[5] * g / 100, 1)))
    # Dernier aliment calculé pour tomber exactement sur 1 276 kcal
    rest = round(TARGET - total, 1)
    f = FOOD['Amandes']; g = round(rest / f[2] * 100, 1)
    rows.append(('collation', 'Amandes', g, rest, round(f[3] * g / 100, 1), round(f[4] * g / 100, 1), round(f[5] * g / 100, 1)))
    assert abs(sum(r[3] for r in rows) - TARGET) < 0.05, sum(r[3] for r in rows)
    return rows


def build():
    L = []
    w = L.append
    w('-- La Tanière Coach — 0003 : données de démonstration (généré par scripts/generate-demo-seed.py, ne pas éditer à la main)')
    w('-- seed_demo() efface et rejoue toutes les données métier SANS toucher aux comptes auth.')
    w('-- Les comptes sont créés par scripts/create-demo-users.ts et retrouvés via raw_user_meta_data->>\'demo_key\'.')
    w('')
    # Fonction interne : copie personnalisée d'un modèle
    w('''create or replace function public._demo_copy_program(p_client uuid, p_template text, p_adaptations jsonb, p_weeks int, p_done_weeks int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_tpl uuid; v_prog uuid; v_base date := date_trunc('week', current_date)::date;
  v_ts record; v_te record; v_sess uuid; v_se uuid; v_date date; v_done boolean; k int; i int;
  v_offsets int[] := array[0, 3, 5];
begin
  select id into v_tpl from program_templates where name = p_template;
  insert into client_programs (client_id, template_id, name, adaptations, start_date)
  values (p_client, v_tpl, p_template, p_adaptations, v_base - (p_done_weeks - 1) * 7)
  returning id into v_prog;
  for k in 1..p_weeks loop
    for v_ts in select * from template_sessions where template_id = v_tpl order by position loop
      v_date := v_base + (k - p_done_weeks) * 7 + v_offsets[v_ts.position + 1];
      v_done := v_date <= current_date and k <= p_done_weeks;
      insert into client_sessions (client_program_id, client_id, label, name, week, date, status, done_at)
      values (v_prog, p_client, v_ts.label, v_ts.name, k, v_date,
              case when v_done then 'done' else 'planned' end,
              case when v_done then v_date + time '18:30' else null end)
      returning id into v_sess;
      for v_te in select * from template_exercises where template_session_id = v_ts.id order by position loop
        insert into session_exercises (client_session_id, client_id, exercise_id, position, consigne, rest_s)
        values (v_sess, p_client, v_te.exercise_id, v_te.position, v_te.consigne, v_te.rest_s) returning id into v_se;
        for i in 1..v_te.sets loop
          insert into sets (session_exercise_id, client_id, set_number, target_reps, target_load_kg, target_rpe, reps, load_kg, rpe, done)
          values (v_se, p_client, i, nullif(regexp_replace(v_te.reps, '[^0-9].*$', ''), '')::smallint, v_te.load_kg, v_te.target_rpe,
                  case when v_done then nullif(regexp_replace(v_te.reps, '[^0-9].*$', ''), '')::smallint end,
                  case when v_done then v_te.load_kg end,
                  case when v_done then v_te.target_rpe end, v_done);
        end loop;
      end loop;
    end loop;
  end loop;
  return v_prog;
end $$;''')
    w('revoke all on function public._demo_copy_program(uuid, text, jsonb, int, int) from public, anon, authenticated;')
    w('')
    w('''create or replace function public.seed_demo() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_karim uuid; v_uid uuid; v_client uuid; v_prog uuid; v_sess uuid; v_tpl uuid; v_ts uuid; v_slot uuid; v_book uuid; v_sub uuid; v_sup uuid;
  v_base date := date_trunc('week', current_date)::date;
  r record; k int;
begin
  select id into v_karim from auth.users where raw_user_meta_data->>'demo_key' = 'karim';
  if v_karim is null then
    raise exception 'Compte coach de démo introuvable : lancez d''abord scripts/create-demo-users.ts.';
  end if;

  -- 1. On repart de zéro (les comptes auth ne sont pas touchés)
  truncate public.app_config, public.integrations, public.invoices, public.subscriptions, public.activities, public.weight_logs,
    public.shopping_items, public.supplement_intakes, public.supplements, public.food_log_entries, public.client_meal_plans,
    public.meal_plan_templates, public.recipes, public.nutrition_goals, public.foods, public.messages, public.session_feedback,
    public.sets, public.session_exercises, public.client_sessions, public.client_programs, public.template_exercises,
    public.template_sessions, public.program_templates, public.exercises, public.intake_forms, public.bookings,
    public.availability_slots, public.coach_notes, public.clients, public.profiles cascade;

  insert into app_config (key, value) values
    ('prix_formules', '[PRIX]'), ('signature', 'Où les loups se rassemblent'), ('slogan', 'Coacher plus, gérer moins.');

  -- 2. Profils
  insert into profiles (id, role, full_name, initials, email) select id, 'coach', 'Karim B.', 'KB', email from auth.users where id = v_karim;
  create temp table if not exists demo_map (key text primary key, profile_id uuid, client_id uuid) on commit drop;
  delete from demo_map;''')
    for c in COACHES:
        key, name, ini, goal, lvl, spw, inj, wkg, excl, chan, targets, tpl = c
        w(f'''  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = {q(key)};
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', {q(key)}; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', {q(name)}, {q(ini)}, email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, {q(goal)}, {q(lvl)}, {spw}, {q(inj)}, {wkg}, {arr(excl)}, {js(targets)}, {q(chan)}, current_date - {30 + COACHES.index(c) * 21})
    returning id into v_client;
    insert into demo_map values ({q(key)}, v_uid, v_client);
  end if;''')
    # Catalogue exercices
    w('\n  -- 3. Catalogues')
    w('  insert into exercises (name_fr, category, muscles, equipment, aliases) values')
    w(',\n'.join(f'    ({q(n)}, {q(cat)}, {arr(m)}, {q(eq)}, {arr(al)})' for n, cat, m, eq, al in EXERCISES) + ';')
    w('  insert into foods (name, category, source, kcal, protein_g, carbs_g, fat_g) values')
    w(',\n'.join(f"    ({q(n)}, {q(cat)}, 'coach', {k}, {p}, {g}, {l})" for n, cat, k, p, g, l in FOODS) + ';')
    for name, (goal, lvl, weeks, spw, desc, sessions) in TEMPLATES.items():
        w(f"  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, {q(name)}, {q(goal)}, {q(lvl)}, {weeks}, {spw}, {q(desc)}) returning id into v_tpl;")
        for pos, (label, sname, exs) in enumerate(sessions):
            w(f"  insert into template_sessions (template_id, label, name, position) values (v_tpl, {q(label)}, {q(sname)}, {pos}) returning id into v_ts;")
            vals = []
            for epos, (ex, sets, reps, load, rpe, rest, cons) in enumerate(exs):
                vals.append(f"(v_ts, (select id from exercises where name_fr = {q(ex)}), {epos}, {sets}, {q(reps)}, {q(load)}, {q(rpe)}, {q(rest)}, {q(cons or None)})")
            w('  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values ' + ', '.join(vals) + ';')
    w('  insert into meal_plan_templates (coach_id, name, goal, kcal_target, description, meals) values')
    w(',\n'.join(f'    (v_karim, {q(n)}, {q(g)}, {k}, {q(d)}, {js(m)})' for n, g, k, d, m in MEAL_PLANS) + ';')
    w('  insert into recipes (coach_id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, ingredients, tags) values')
    w(',\n'.join(f'    (v_karim, {q(n)}, {s}, {k}, {p}, {c}, {f}, {js([{"aliment": a, "quantite": b} for a, b in ing])}, {arr(t)})' for n, s, k, p, c, f, ing, t in RECIPES) + ';')

    # Programmes personnalisés
    w('\n  -- 4. Copies personnalisées des programmes')
    for c in COACHES:
        key, tpl = c[0], c[11]
        adapt = {
            'lea': ['Charges calées sur son bilan', 'Fentes remplacées par step-up (genou gauche)', '3 séances par semaine'],
            'tom': ['Charges légères de reprise', 'Genou droit : pas de fentes profondes'],
            'camille': ['Dos : pas de charge lourde sur la colonne'],
            'sarah': ['2 séances par semaine'], 'julie': ['Charges calées sur son bilan'], 'theo': ['Épaule droite : pas de développé militaire'],
        }.get(key, ['Charges calées sur son bilan'])
        done = 5 if key == 'lea' else 3
        w(f"  select client_id into v_client from demo_map where key = {q(key)};")
        w(f"  if v_client is not null then perform _demo_copy_program(v_client, {q(tpl)}, {js(adapt)}, {done + 3}, {done}); end if;")

    # Histoire de Léa
    w('''
  -- 5. L'histoire de Léa : fentes remplacées, squat de 50 à 60 kg, retour « Squat facile » RPE 6
  select client_id into v_client from demo_map where key = 'lea';
  if v_client is not null then
    update session_exercises set exercise_id = (select id from exercises where name_fr = 'Step-up'), consigne = 'Remplace les fentes : genou gauche sensible'
      where client_id = v_client and exercise_id = (select id from exercises where name_fr = 'Fentes avant');
    update sets s set target_load_kg = least(60, 50 + 2.5 * (cs.week - 1)), target_reps = 6, target_rpe = 7,
        load_kg = case when s.done then least(60, 50 + 2.5 * (cs.week - 1)) end,
        reps = case when s.done then 6 end,
        rpe = case when s.done then (case when cs.week >= 4 then 6 else 7 end) end
      from session_exercises se join client_sessions cs on cs.id = se.client_session_id
      where s.session_exercise_id = se.id and se.client_id = v_client
        and se.exercise_id = (select id from exercises where name_fr = 'Squat barre');
    -- La séance A de cette semaine (lundi) est faite : c'est celle du retour.
    update client_sessions set status = 'done', done_at = date + time '18:30' where client_id = v_client and week = 5 and label = 'A';
    update sets set done = true, reps = coalesce(reps, target_reps), load_kg = coalesce(load_kg, target_load_kg), rpe = coalesce(rpe, 6)
      where session_exercise_id in (select se.id from session_exercises se join client_sessions cs on cs.id = se.client_session_id where cs.client_id = v_client and cs.week = 5 and cs.label = 'A');
    insert into coach_notes (client_id, coach_id, body) values (v_client, v_karim, 'Très régulière, peut monter vite au squat. Surveiller le genou gauche en descente.');
    insert into nutrition_goals (client_id, day_type, kcal, protein_g, carbs_g, fat_g) values (v_client, 'training', 2100, 130, 240, 70), (v_client, 'rest', 1900, 120, 205, 65);
    insert into client_meal_plans (client_id, template_id, name, adaptations, kcal_target, meals)
      select v_client, id, 'Prise de force — Léa', '["Calories calculées pour 62 kg", "Jours d''entraînement : 2 100 kcal"]'::jsonb, 2100, meals from meal_plan_templates where name = 'Prise de force';
    insert into supplements (client_id, name, dose, timing) values (v_client, 'Créatine monohydrate', '5 g', 'Le matin') returning id into v_sup;
    insert into supplement_intakes (supplement_id, client_id, date) values (v_sup, v_client, v_base);
    insert into supplements (client_id, name, dose, timing) values (v_client, 'Vitamine D', '1 000 UI', 'Au déjeuner');
    insert into shopping_items (client_id, name, quantity, checked) values
      (v_client, 'Flocons d''avoine', '1 kg', false), (v_client, 'Skyr nature', '6 pots', true), (v_client, 'Blancs de poulet', '600 g', false), (v_client, 'Riz basmati', '1 kg', false);
    insert into weight_logs (client_id, date, weight_kg, source) values (v_client, v_base - 14, 62.4, 'manuel'), (v_client, v_base - 7, 62.1, 'manuel'), (v_client, v_base, 62.0, 'manuel');''')
    w('    insert into food_log_entries (client_id, date, meal, food_id, quantity, kcal, protein_g, carbs_g, fat_g) values')
    w(',\n'.join(f"      (v_client, v_base, {q(m)}, (select id from foods where name = {q(n)}), {g}, {k}, {p}, {c}, {f})" for m, n, g, k, p, c, f in log_rows()) + ';')
    w('''    update food_log_entries set coach_comment = 'Bien pour les protéines ! Ajoute une collation glucidique avant la séance.' where client_id = v_client and date = v_base and meal = 'dejeuner' and food_id = (select id from foods where name = 'Blanc de poulet cuit');
    insert into integrations (user_id, provider, status, connected_at, last_sync_at, shared_scopes)
      select profile_id, 'strava', 'connected', now() - interval '20 days', now() - interval '2 hours', '{"visible_coach": false}'::jsonb from demo_map where key = 'lea';
    insert into integrations (user_id, provider, status) select profile_id, p, 'disconnected' from demo_map, unnest(array['withings', 'garmin', 'apple_sante', 'health_connect', 'whoop']) p where key = 'lea';
  end if;''')

    # Retours de séance et messages
    w('\n  -- 6. Retours de séance (dernière séance faite de chaque coaché) et messages')
    for key, rpe, feel, pain, note, handled in FEEDBACK:
        w(f'''  select client_id into v_client from demo_map where key = {q(key)};
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' {"and week = 5 and label = 'A' " if key == 'lea' else ''}order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, {rpe}, {q(feel)}, {q(pain)}, {q(note)}, done_at + interval '25 minutes', {('done_at + interval ' + q('5 hours')) if handled else 'null'} from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = {q(key)}), 'Retour envoyé : ' || name || ' — RPE {rpe}', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', {rpe}), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;''')
    w('''  select client_id into v_client from demo_map where key = 'lea';
  if v_client is not null then
    insert into messages (client_id, sender, sender_id, body, kind, payload, created_at) values
      (v_client, 'coach', v_karim, 'Bienvenue Léa ! Ton programme est prêt, on vise 70 kg au squat.', 'text', null, now() - interval '28 days'),
      (v_client, 'systeme', v_karim, 'Programme personnalisé : Force bas du corps', 'event', '{"type": "programme"}'::jsonb, now() - interval '28 days' + interval '1 minute'),
      (v_client, 'coache', (select profile_id from demo_map where key = 'lea'), 'Merci ! Hâte de commencer.', 'text', null, now() - interval '27 days');
  end if;
  select client_id into v_client from demo_map where key = 'tom';
  if v_client is not null then
    insert into messages (client_id, sender, sender_id, body, kind, created_at) values
      (v_client, 'coach', v_karim, 'Salut Tom, on reprend en douceur cette semaine.', 'text', now() - interval '9 days');
  end if;''')

    # Nutrition des autres
    w('''
  -- 7. Objectifs et plans nutritionnels des autres coachés
  for r in select m.key, m.client_id, c.weight_kg from demo_map m join clients c on c.id = m.client_id where m.key <> 'lea' loop
    insert into nutrition_goals (client_id, day_type, kcal, protein_g, carbs_g, fat_g) values
      (r.client_id, 'training', round(r.weight_kg * 31)::int, round(r.weight_kg * 1.8)::int, round(r.weight_kg * 3.5)::int, round(r.weight_kg * 1.0)::int),
      (r.client_id, 'rest', round(r.weight_kg * 28)::int, round(r.weight_kg * 1.8)::int, round(r.weight_kg * 2.8)::int, round(r.weight_kg * 1.0)::int);
  end loop;
  select client_id into v_client from demo_map where key = 'sarah';
  if v_client is not null then
    insert into client_meal_plans (client_id, template_id, name, adaptations, kcal_target, meals)
      select v_client, id, 'Équilibre — Sarah', '["Sans poisson", "Calories calculées pour 64 kg"]'::jsonb, 1850, meals from meal_plan_templates where name = 'Végétarien équilibré';
  end if;
  select client_id into v_client from demo_map where key = 'ines';
  if v_client is not null then
    insert into client_meal_plans (client_id, template_id, name, adaptations, kcal_target, meals)
      select v_client, id, 'Perte de poids — Inès', '["Calories calculées pour 78 kg"]'::jsonb, 1700, meals from meal_plan_templates where name = 'Perte de poids douce';
  end if;''')

    # Abonnements
    w('''
  -- 8. Abonnements (prix null : l'app affiche [PRIX]) et factures
  k := 0;
  for r in select m.key, m.client_id from demo_map m order by m.key loop
    k := k + 1;
    insert into subscriptions (client_id, plan_name, price_eur, period, starts_on, renews_on, status)
    values (r.client_id,
            case when k % 3 = 0 then 'Trimestre' when k % 3 = 1 then 'Suivi mensuel' else 'Suivi premium' end,
            null,
            case when k % 3 = 0 then 'trimestriel' else 'mensuel' end,
            current_date - 60,
            current_date + (case when r.key in ('tom', 'hugo', 'camille', 'julie') then k % 7 else 10 + k * 2 end),
            case when r.key in ('tom', 'hugo', 'camille', 'julie') then 'a_renouveler' else 'actif' end)
    returning id into v_sub;
    insert into invoices (subscription_id, client_id, number, amount_eur, issued_on, status) values
      (v_sub, r.client_id, 'F-' || to_char(current_date - 60, 'YYYYMM') || '-' || lpad(k::text, 3, '0'), null, current_date - 60, 'payee'),
      (v_sub, r.client_id, 'F-' || to_char(current_date - 30, 'YYYYMM') || '-' || lpad(k::text, 3, '0'), null, current_date - 30, case when r.key = 'tom' then 'en_attente' else 'payee' end);
  end loop;

  -- 9. Créneaux de Karim sur 2 semaines et prospects
  for k in 0..13 loop
    if extract(isodow from current_date + k) <= 5 then
      insert into availability_slots (coach_id, starts_at, ends_at, format) values
        (v_karim, (current_date + k) + time '12:30', (current_date + k) + time '13:15', 'visio'),
        (v_karim, (current_date + k) + time '18:00', (current_date + k) + time '18:45', 'salle'),
        (v_karim, (current_date + k) + time '19:00', (current_date + k) + time '19:45', 'les_deux');
    elsif extract(isodow from current_date + k) = 6 then
      insert into availability_slots (coach_id, starts_at, ends_at, format) values
        (v_karim, (current_date + k) + time '10:00', (current_date + k) + time '10:45', 'salle');
    end if;
  end loop;

  select id into v_slot from availability_slots where coach_id = v_karim and starts_at > now() + interval '1 day' order by starts_at limit 1;
  insert into bookings (coach_id, slot_id, full_name, phone, email, starts_at, format, status)
    select v_karim, id, 'Nora Benali', '06 41 22 18 90', 'nora.benali@exemple.fr', starts_at, 'visio', 'confirme' from availability_slots where id = v_slot
    returning id into v_book;
  insert into intake_forms (booking_id, status, answers) values (v_book, 'recu', '{"objectif": "Perdre 5 kg et renforcer le dos", "disponibilites": "2 soirs par semaine et le samedi matin", "niveau": "debutant", "experience": "Salle il y a 3 ans", "douleurs": "Douleur lombaire en fin de journée", "alimentation": "Grignotage le soir", "sommeil": "6 h par nuit"}'::jsonb);

  select id into v_slot from availability_slots where coach_id = v_karim and starts_at > now() + interval '2 days' and is_booked = false and format in ('salle', 'les_deux') order by starts_at limit 1;
  insert into bookings (coach_id, slot_id, full_name, phone, email, starts_at, format, status)
    select v_karim, id, 'Emma Dubois', '07 62 10 44 31', 'emma.dubois@exemple.fr', starts_at, 'salle', 'confirme' from availability_slots where id = v_slot
    returning id into v_book;
  insert into intake_forms (booking_id, status, answers) values (v_book, 'recu', '{"objectif": "Préparer un trail de 20 km", "disponibilites": "3 matins par semaine", "niveau": "intermediaire", "experience": "Course 2 fois par semaine", "douleurs": "Aucune", "alimentation": "Équilibrée", "sommeil": "7 h 30 par nuit"}'::jsonb);

  select id into v_slot from availability_slots where coach_id = v_karim and starts_at > now() + interval '3 days' and is_booked = false and format in ('visio', 'les_deux') order by starts_at limit 1;
  insert into bookings (coach_id, slot_id, full_name, phone, email, starts_at, format, status)
    select v_karim, id, 'Lucas Fontaine', '06 03 87 55 12', 'lucas.fontaine@exemple.fr', starts_at, 'visio', 'demande' from availability_slots where id = v_slot
    returning id into v_book;
  insert into intake_forms (booking_id, status) values (v_book, 'en_attente');

  -- 10. Intégrations du coach (toutes simulées, non connectées au départ)
  insert into integrations (user_id, provider, status) select v_karim, p, 'disconnected'
    from unnest(array['google_agenda', 'outlook', 'ics', 'paiement', 'notifications']) p;
end $$;''')
    w('revoke all on function public.seed_demo() from public, anon, authenticated;')
    w("do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function public.seed_demo() to service_role; end if; end $$;")
    w('')
    w('''-- Réservé au coach connecté : remet la démo à zéro avant la soutenance.
create or replace function public.reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then
    raise exception 'Seul le coach peut réinitialiser la démo.' using errcode = '42501';
  end if;
  perform public.seed_demo();
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;''')
    return '\n'.join(L) + '\n'


if __name__ == '__main__':
    sql = build()
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(sql)
    print('Écrit :', OUT, f'({len(sql) // 1024} Ko)')
