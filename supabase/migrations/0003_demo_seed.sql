-- La Tanière Coach — 0003 : données de démonstration (généré par scripts/generate-demo-seed.py, ne pas éditer à la main)
-- seed_demo() efface et rejoue toutes les données métier SANS toucher aux comptes auth.
-- Les comptes sont créés par scripts/create-demo-users.ts et retrouvés via raw_user_meta_data->>'demo_key'.

create or replace function public._demo_copy_program(p_client uuid, p_template text, p_adaptations jsonb, p_weeks int, p_done_weeks int)
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
end $$;
revoke all on function public._demo_copy_program(uuid, text, jsonb, int, int) from public, anon, authenticated;

create or replace function public.seed_demo() returns void
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
  delete from demo_map;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'lea';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'lea'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Léa Martin', 'LM', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Prise de force, objectif squat 70 kg', 'intermediaire', 3, 'Genou gauche sensible en descente', 62, '{}'::text[], '{"squat_kg": 70}'::jsonb, 'app', current_date - 30)
    returning id into v_client;
    insert into demo_map values ('lea', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'tom';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'tom'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Tom Bernard', 'TB', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Remise en forme après deux ans d’arrêt', 'debutant', 2, 'Genou droit fragile', 84, '{}'::text[], '{}'::jsonb, 'whatsapp', current_date - 51)
    returning id into v_client;
    insert into demo_map values ('tom', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'yanis';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'yanis'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Yanis Saïdi', 'YS', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Prise de muscle', 'intermediaire', 4, null, 71, '{}'::text[], '{"poids_kg": 75}'::jsonb, 'whatsapp', current_date - 72)
    returning id into v_client;
    insert into demo_map values ('yanis', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'ines';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'ines'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Inès Kaci', 'IK', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Perte de poids durable', 'debutant', 3, null, 78, '{}'::text[], '{"poids_kg": 70}'::jsonb, 'app', current_date - 93)
    returning id into v_client;
    insert into demo_map values ('ines', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'hugo';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'hugo'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Hugo Lefèvre', 'HL', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Courir un semi-marathon en moins de 1 h 50', 'intermediaire', 3, 'Tendinite d’Achille ancienne', 70, '{}'::text[], '{"semi": "1:50"}'::jsonb, 'whatsapp', current_date - 114)
    returning id into v_client;
    insert into demo_map values ('hugo', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'camille';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'camille'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Camille Roux', 'CR', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Mobilité et dos sans douleur', 'debutant', 2, 'Lombalgie chronique', 58, '{}'::text[], '{}'::jsonb, 'app', current_date - 135)
    returning id into v_client;
    insert into demo_map values ('camille', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'sarah';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'sarah'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Sarah Petit', 'SP', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Retrouver de l’énergie et mieux manger', 'debutant', 2, null, 64, array['poisson']::text[], '{}'::jsonb, 'app', current_date - 156)
    returning id into v_client;
    insert into demo_map values ('sarah', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'malik';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'malik'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Malik Diallo', 'MD', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Terminer un Hyrox en moins de 1 h 30', 'confirme', 5, null, 82, '{}'::text[], '{"hyrox": "1:30"}'::jsonb, 'app', current_date - 177)
    returning id into v_client;
    insert into demo_map values ('malik', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'julie';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'julie'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Julie Moreau', 'JM', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Tonification et régularité', 'debutant', 3, null, 60, array['lactose']::text[], '{}'::jsonb, 'app', current_date - 198)
    returning id into v_client;
    insert into demo_map values ('julie', v_uid, v_client);
  end if;
  select id into v_uid from auth.users where raw_user_meta_data->>'demo_key' = 'theo';
  if v_uid is null then raise notice 'Compte démo % absent : coaché ignoré.', 'theo'; else
    insert into profiles (id, role, full_name, initials, email, coach_id) select v_uid, 'coache', 'Théo Garnier', 'TG', email, v_karim from auth.users where id = v_uid;
    insert into clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, targets, preferred_channel, since)
    values (v_uid, v_karim, 'Force athlétique', 'confirme', 4, 'Épaule droite à surveiller', 90, '{}'::text[], '{"squat_kg": 180}'::jsonb, 'whatsapp', current_date - 219)
    returning id into v_client;
    insert into demo_map values ('theo', v_uid, v_client);
  end if;

  -- 3. Catalogues
  insert into exercises (name_fr, category, muscles, equipment, aliases) values
    ('Squat barre', 'Jambes', array['quadriceps','fessiers']::text[], 'barre', array['back squat']::text[]),
    ('Squat avant', 'Jambes', array['quadriceps','gainage']::text[], 'barre', array['front squat']::text[]),
    ('Goblet squat', 'Jambes', array['quadriceps','fessiers']::text[], 'haltère', array['squat gobelet']::text[]),
    ('Squat bulgare', 'Jambes', array['quadriceps','fessiers']::text[], 'haltères', array['fente bulgare','split squat']::text[]),
    ('Fentes avant', 'Jambes', array['quadriceps','fessiers']::text[], 'haltères', array['fentes']::text[]),
    ('Fentes marchées', 'Jambes', array['quadriceps','fessiers']::text[], 'haltères', array['walking lunges']::text[]),
    ('Step-up', 'Jambes', array['quadriceps','fessiers']::text[], 'banc', array['montée sur banc']::text[]),
    ('Presse à cuisses', 'Jambes', array['quadriceps','fessiers']::text[], 'machine', array['leg press']::text[]),
    ('Leg extension', 'Jambes', array['quadriceps']::text[], 'machine', array['extension des jambes']::text[]),
    ('Leg curl allongé', 'Jambes', array['ischio-jambiers']::text[], 'machine', array['leg curl']::text[]),
    ('Soulevé de terre', 'Chaîne postérieure', array['ischio-jambiers','fessiers','dos']::text[], 'barre', array['deadlift']::text[]),
    ('Soulevé de terre roumain', 'Chaîne postérieure', array['ischio-jambiers','fessiers']::text[], 'barre', array['RDL']::text[]),
    ('Soulevé de terre jambes tendues', 'Chaîne postérieure', array['ischio-jambiers']::text[], 'haltères', array['stiff leg']::text[]),
    ('Hip thrust', 'Fessiers', array['fessiers']::text[], 'barre', array['poussée de hanche']::text[]),
    ('Pont fessier', 'Fessiers', array['fessiers']::text[], 'poids du corps', array['glute bridge']::text[]),
    ('Abduction hanche', 'Fessiers', array['moyen fessier']::text[], 'machine', array['abducteurs']::text[]),
    ('Kettlebell swing', 'Chaîne postérieure', array['fessiers','ischio-jambiers']::text[], 'kettlebell', array['swing']::text[]),
    ('Good morning', 'Chaîne postérieure', array['ischio-jambiers','lombaires']::text[], 'barre', '{}'::text[]),
    ('Mollets debout', 'Jambes', array['mollets']::text[], 'machine', array['extension mollets']::text[]),
    ('Mollets assis', 'Jambes', array['mollets']::text[], 'machine', '{}'::text[]),
    ('Développé couché', 'Pectoraux', array['pectoraux','triceps','épaules']::text[], 'barre', array['bench press']::text[]),
    ('Développé incliné haltères', 'Pectoraux', array['pectoraux haut','épaules']::text[], 'haltères', array['incliné']::text[]),
    ('Développé haltères', 'Pectoraux', array['pectoraux','triceps']::text[], 'haltères', array['dumbbell press']::text[]),
    ('Écarté à la poulie', 'Pectoraux', array['pectoraux']::text[], 'poulie', array['cable fly']::text[]),
    ('Pompes', 'Pectoraux', array['pectoraux','triceps']::text[], 'poids du corps', array['push-up']::text[]),
    ('Pompes inclinées', 'Pectoraux', array['pectoraux','triceps']::text[], 'banc', array['pompes surélevées mains']::text[]),
    ('Dips', 'Pectoraux', array['pectoraux bas','triceps']::text[], 'barres parallèles', '{}'::text[]),
    ('Développé militaire', 'Épaules', array['épaules','triceps']::text[], 'barre', array['overhead press']::text[]),
    ('Développé épaules haltères', 'Épaules', array['épaules']::text[], 'haltères', array['shoulder press']::text[]),
    ('Élévations latérales', 'Épaules', array['deltoïde moyen']::text[], 'haltères', array['lateral raise']::text[]),
    ('Oiseau', 'Épaules', array['deltoïde postérieur']::text[], 'haltères', array['rear delt fly']::text[]),
    ('Face pull', 'Épaules', array['deltoïde postérieur','trapèzes']::text[], 'poulie', '{}'::text[]),
    ('Tractions', 'Dos', array['grand dorsal','biceps']::text[], 'barre fixe', array['pull-up']::text[]),
    ('Tractions assistées', 'Dos', array['grand dorsal','biceps']::text[], 'élastique', '{}'::text[]),
    ('Tirage vertical', 'Dos', array['grand dorsal']::text[], 'poulie', array['lat pulldown']::text[]),
    ('Rowing barre', 'Dos', array['dos','biceps']::text[], 'barre', array['bent-over row']::text[]),
    ('Rowing haltère', 'Dos', array['dos','biceps']::text[], 'haltère', array['one arm row']::text[]),
    ('Tirage horizontal', 'Dos', array['dos','biceps']::text[], 'poulie', array['seated row']::text[]),
    ('Rowing inversé', 'Dos', array['dos','biceps']::text[], 'barre', array['inverted row']::text[]),
    ('Shrug', 'Dos', array['trapèzes']::text[], 'haltères', array['haussement d''épaules']::text[]),
    ('Curl biceps haltères', 'Bras', array['biceps']::text[], 'haltères', array['curl']::text[]),
    ('Curl marteau', 'Bras', array['biceps','avant-bras']::text[], 'haltères', array['hammer curl']::text[]),
    ('Curl barre', 'Bras', array['biceps']::text[], 'barre', '{}'::text[]),
    ('Extension triceps poulie', 'Bras', array['triceps']::text[], 'poulie', array['pushdown']::text[]),
    ('Barre au front', 'Bras', array['triceps']::text[], 'barre', array['skull crusher']::text[]),
    ('Extension triceps au-dessus de la tête', 'Bras', array['triceps']::text[], 'haltère', '{}'::text[]),
    ('Gainage', 'Gainage', array['abdominaux','transverse']::text[], 'poids du corps', array['planche']::text[]),
    ('Gainage latéral', 'Gainage', array['obliques']::text[], 'poids du corps', array['side plank']::text[]),
    ('Dead bug', 'Gainage', array['transverse','abdominaux']::text[], 'poids du corps', '{}'::text[]),
    ('Bird dog', 'Gainage', array['lombaires','transverse']::text[], 'poids du corps', '{}'::text[]),
    ('Crunch', 'Gainage', array['abdominaux']::text[], 'poids du corps', '{}'::text[]),
    ('Relevé de jambes suspendu', 'Gainage', array['abdominaux']::text[], 'barre fixe', array['hanging leg raise']::text[]),
    ('Pallof press', 'Gainage', array['obliques','transverse']::text[], 'élastique', '{}'::text[]),
    ('Russian twist', 'Gainage', array['obliques']::text[], 'médecine-ball', '{}'::text[]),
    ('Roue abdominale', 'Gainage', array['abdominaux']::text[], 'roue', array['ab wheel']::text[]),
    ('Farmer walk', 'Gainage', array['avant-bras','trapèzes','gainage']::text[], 'haltères', array['marche du fermier']::text[]),
    ('Burpees', 'Cardio', array['corps entier']::text[], 'poids du corps', '{}'::text[]),
    ('Mountain climbers', 'Cardio', array['gainage','cardio']::text[], 'poids du corps', '{}'::text[]),
    ('Jumping jacks', 'Cardio', array['cardio']::text[], 'poids du corps', '{}'::text[]),
    ('Corde à sauter', 'Cardio', array['mollets','cardio']::text[], 'corde', '{}'::text[]),
    ('Rameur', 'Cardio', array['corps entier']::text[], 'rameur', array['rowing ergomètre']::text[]),
    ('Vélo', 'Cardio', array['jambes','cardio']::text[], 'vélo', array['vélo d''appartement']::text[]),
    ('SkiErg', 'Cardio', array['dos','bras','cardio']::text[], 'SkiErg', '{}'::text[]),
    ('Course allure facile', 'Course', array['jambes','cardio']::text[], 'aucun', array['footing']::text[]),
    ('Sortie longue', 'Course', array['jambes','cardio']::text[], 'aucun', '{}'::text[]),
    ('Fractionné 400 m', 'Course', array['jambes','cardio']::text[], 'aucun', array['intervalles']::text[]),
    ('Tempo run', 'Course', array['jambes','cardio']::text[], 'aucun', array['allure seuil']::text[]),
    ('Sled push', 'Hyrox', array['jambes','corps entier']::text[], 'traîneau', array['poussée de traîneau']::text[]),
    ('Sled pull', 'Hyrox', array['dos','jambes']::text[], 'traîneau', array['tirage de traîneau']::text[]),
    ('Wall balls', 'Hyrox', array['jambes','épaules']::text[], 'médecine-ball', '{}'::text[]),
    ('Burpee broad jump', 'Hyrox', array['corps entier']::text[], 'poids du corps', '{}'::text[]),
    ('Sandbag lunges', 'Hyrox', array['jambes']::text[], 'sac lesté', array['fentes sandbag']::text[]),
    ('Thruster', 'Haltérophilie', array['jambes','épaules']::text[], 'barre', '{}'::text[]),
    ('Épaulé', 'Haltérophilie', array['corps entier']::text[], 'barre', array['power clean']::text[]),
    ('Box jump', 'Pliométrie', array['jambes']::text[], 'box', array['saut sur caisse']::text[]),
    ('Mobilité hanches 90/90', 'Mobilité', array['hanches']::text[], 'aucun', array['90/90']::text[]),
    ('Chat-vache', 'Mobilité', array['colonne']::text[], 'aucun', array['cat-cow']::text[]),
    ('Étirement ischio-jambiers', 'Mobilité', array['ischio-jambiers']::text[], 'aucun', '{}'::text[]),
    ('Mobilité thoracique', 'Mobilité', array['thoracique']::text[], 'aucun', array['rotation thoracique']::text[]),
    ('Étirement fléchisseurs de hanche', 'Mobilité', array['psoas']::text[], 'aucun', '{}'::text[]),
    ('Rotations d''épaules à l''élastique', 'Mobilité', array['épaules']::text[], 'élastique', '{}'::text[]),
    ('Respiration diaphragmatique', 'Mobilité', array['diaphragme']::text[], 'aucun', '{}'::text[]);
  insert into foods (name, category, source, kcal, protein_g, carbs_g, fat_g) values
    ('Flocons d''avoine', 'Céréales', 'coach', 370, 13.5, 58.7, 7.0),
    ('Riz blanc cuit', 'Féculents', 'coach', 130, 2.7, 28.2, 0.3),
    ('Riz complet cuit', 'Féculents', 'coach', 123, 2.7, 25.6, 1.0),
    ('Riz basmati cuit', 'Féculents', 'coach', 121, 3.0, 25.2, 0.4),
    ('Pâtes cuites', 'Féculents', 'coach', 131, 4.8, 25.8, 0.9),
    ('Pâtes complètes cuites', 'Féculents', 'coach', 124, 5.3, 23.2, 1.1),
    ('Quinoa cuit', 'Féculents', 'coach', 120, 4.4, 21.3, 1.9),
    ('Semoule cuite', 'Féculents', 'coach', 112, 3.8, 23.2, 0.2),
    ('Boulgour cuit', 'Féculents', 'coach', 83, 3.1, 18.6, 0.2),
    ('Pomme de terre cuite', 'Féculents', 'coach', 80, 2.0, 17.0, 0.1),
    ('Patate douce cuite', 'Féculents', 'coach', 86, 1.6, 20.1, 0.1),
    ('Purée de pommes de terre', 'Féculents', 'coach', 88, 2.0, 13.5, 3.0),
    ('Frites', 'Féculents', 'coach', 267, 3.4, 35.5, 12.0),
    ('Pain baguette', 'Pains', 'coach', 269, 9.0, 55.0, 1.2),
    ('Pain complet', 'Pains', 'coach', 239, 8.9, 44.0, 2.3),
    ('Pain de mie', 'Pains', 'coach', 274, 8.4, 49.0, 4.4),
    ('Pain aux céréales', 'Pains', 'coach', 254, 9.5, 43.0, 4.0),
    ('Biscottes', 'Pains', 'coach', 404, 11.0, 73.0, 6.5),
    ('Galettes de riz', 'Céréales', 'coach', 386, 8.0, 80.0, 3.0),
    ('Muesli sans sucre ajouté', 'Céréales', 'coach', 360, 10.0, 62.0, 6.5),
    ('Corn flakes', 'Céréales', 'coach', 378, 7.0, 84.0, 0.9),
    ('Granola', 'Céréales', 'coach', 447, 9.5, 63.0, 16.0),
    ('Farine de blé', 'Céréales', 'coach', 345, 10.0, 72.0, 1.2),
    ('Tortilla de blé', 'Pains', 'coach', 310, 8.5, 51.0, 7.5),
    ('Lentilles cuites', 'Légumineuses', 'coach', 116, 9.0, 16.3, 0.4),
    ('Pois chiches cuits', 'Légumineuses', 'coach', 139, 8.0, 19.0, 2.6),
    ('Haricots rouges cuits', 'Légumineuses', 'coach', 115, 8.7, 15.0, 0.5),
    ('Haricots blancs cuits', 'Légumineuses', 'coach', 107, 7.0, 16.0, 0.6),
    ('Pois cassés cuits', 'Légumineuses', 'coach', 118, 8.3, 18.0, 0.4),
    ('Edamame', 'Légumineuses', 'coach', 121, 11.9, 8.9, 5.2),
    ('Blanc de poulet cuit', 'Viandes', 'coach', 121, 25.5, 0.0, 2.0),
    ('Cuisse de poulet rôtie', 'Viandes', 'coach', 204, 25.0, 0.0, 11.5),
    ('Escalope de dinde cuite', 'Viandes', 'coach', 117, 26.0, 0.0, 1.4),
    ('Bœuf haché 5 % cuit', 'Viandes', 'coach', 160, 26.0, 0.0, 6.0),
    ('Bœuf haché 15 % cuit', 'Viandes', 'coach', 230, 25.0, 0.0, 14.5),
    ('Steak de bœuf grillé', 'Viandes', 'coach', 166, 28.5, 0.0, 5.6),
    ('Rôti de porc cuit', 'Viandes', 'coach', 183, 28.0, 0.0, 7.8),
    ('Filet mignon de porc cuit', 'Viandes', 'coach', 148, 27.0, 0.0, 4.4),
    ('Jambon blanc', 'Charcuterie', 'coach', 113, 20.0, 1.0, 3.2),
    ('Jambon cru', 'Charcuterie', 'coach', 241, 26.0, 0.5, 15.0),
    ('Blanc de dinde tranché', 'Charcuterie', 'coach', 105, 20.0, 1.5, 2.0),
    ('Saucisson sec', 'Charcuterie', 'coach', 418, 26.0, 2.0, 34.0),
    ('Lardons cuits', 'Charcuterie', 'coach', 337, 23.0, 0.5, 27.0),
    ('Agneau gigot rôti', 'Viandes', 'coach', 213, 26.0, 0.0, 12.0),
    ('Veau escalope cuite', 'Viandes', 'coach', 141, 29.0, 0.0, 2.5),
    ('Saumon cuit', 'Poissons', 'coach', 206, 25.0, 0.0, 11.8),
    ('Saumon fumé', 'Poissons', 'coach', 182, 22.0, 0.5, 10.4),
    ('Thon au naturel', 'Poissons', 'coach', 116, 26.0, 0.0, 1.0),
    ('Thon à l''huile égoutté', 'Poissons', 'coach', 198, 27.0, 0.0, 10.0),
    ('Cabillaud cuit', 'Poissons', 'coach', 95, 21.0, 0.0, 0.9),
    ('Colin cuit', 'Poissons', 'coach', 90, 19.5, 0.0, 1.1),
    ('Sardines à l''huile', 'Poissons', 'coach', 220, 24.0, 0.0, 14.0),
    ('Maquereau cuit', 'Poissons', 'coach', 230, 22.0, 0.0, 15.5),
    ('Crevettes cuites', 'Poissons', 'coach', 99, 22.0, 0.5, 1.2),
    ('Moules cuites', 'Poissons', 'coach', 120, 20.0, 4.0, 2.5),
    ('Truite cuite', 'Poissons', 'coach', 150, 22.0, 0.0, 6.6),
    ('Surimi', 'Poissons', 'coach', 105, 7.0, 15.0, 1.5),
    ('Œuf entier', 'Œufs', 'coach', 140, 12.6, 0.6, 9.8),
    ('Blanc d''œuf', 'Œufs', 'coach', 48, 10.7, 0.7, 0.2),
    ('Jaune d''œuf', 'Œufs', 'coach', 329, 16.0, 0.6, 29.0),
    ('Œuf dur', 'Œufs', 'coach', 134, 12.5, 0.6, 9.0),
    ('Tofu ferme', 'Protéines végétales', 'coach', 145, 15.0, 2.0, 8.5),
    ('Tempeh', 'Protéines végétales', 'coach', 193, 19.0, 9.0, 10.8),
    ('Seitan', 'Protéines végétales', 'coach', 130, 25.0, 5.0, 1.5),
    ('Steak végétal soja', 'Protéines végétales', 'coach', 200, 17.0, 7.0, 11.0),
    ('Lait demi-écrémé', 'Produits laitiers', 'coach', 46, 3.3, 4.8, 1.6),
    ('Lait écrémé', 'Produits laitiers', 'coach', 34, 3.4, 4.9, 0.1),
    ('Lait entier', 'Produits laitiers', 'coach', 65, 3.3, 4.7, 3.6),
    ('Boisson soja nature', 'Boissons végétales', 'coach', 39, 3.3, 0.7, 2.0),
    ('Boisson amande', 'Boissons végétales', 'coach', 24, 0.5, 3.0, 1.1),
    ('Boisson avoine', 'Boissons végétales', 'coach', 46, 0.6, 7.0, 1.5),
    ('Yaourt nature', 'Produits laitiers', 'coach', 55, 4.2, 5.6, 1.4),
    ('Yaourt grec', 'Produits laitiers', 'coach', 117, 6.0, 4.0, 8.5),
    ('Skyr nature', 'Produits laitiers', 'coach', 62, 10.5, 4.0, 0.2),
    ('Fromage blanc 0 %', 'Produits laitiers', 'coach', 48, 7.5, 4.2, 0.1),
    ('Fromage blanc 3 %', 'Produits laitiers', 'coach', 75, 7.0, 4.0, 3.2),
    ('Petit-suisse nature', 'Produits laitiers', 'coach', 110, 9.0, 3.5, 6.5),
    ('Emmental', 'Fromages', 'coach', 380, 28.0, 0.5, 29.5),
    ('Comté', 'Fromages', 'coach', 416, 28.0, 0.5, 34.0),
    ('Camembert', 'Fromages', 'coach', 264, 20.0, 0.5, 20.5),
    ('Mozzarella', 'Fromages', 'coach', 240, 18.0, 1.0, 18.0),
    ('Feta', 'Fromages', 'coach', 265, 16.0, 1.5, 21.5),
    ('Chèvre frais', 'Fromages', 'coach', 200, 11.0, 2.5, 16.0),
    ('Parmesan', 'Fromages', 'coach', 392, 33.0, 0.0, 28.5),
    ('Cottage cheese', 'Produits laitiers', 'coach', 98, 11.0, 3.4, 4.3),
    ('Ricotta', 'Fromages', 'coach', 150, 9.0, 3.5, 11.0),
    ('Beurre', 'Matières grasses', 'coach', 745, 0.7, 0.6, 82.0),
    ('Crème fraîche 30 %', 'Produits laitiers', 'coach', 292, 2.3, 3.0, 30.0),
    ('Crème légère 15 %', 'Produits laitiers', 'coach', 165, 2.8, 4.0, 15.0),
    ('Banane', 'Fruits', 'coach', 90, 1.1, 20.5, 0.3),
    ('Pomme', 'Fruits', 'coach', 53, 0.3, 11.6, 0.2),
    ('Poire', 'Fruits', 'coach', 55, 0.4, 11.4, 0.2),
    ('Orange', 'Fruits', 'coach', 46, 0.9, 8.7, 0.2),
    ('Clémentine', 'Fruits', 'coach', 46, 0.8, 9.6, 0.2),
    ('Kiwi', 'Fruits', 'coach', 58, 1.1, 10.4, 0.6),
    ('Fraises', 'Fruits', 'coach', 33, 0.6, 6.0, 0.3),
    ('Framboises', 'Fruits', 'coach', 49, 1.2, 4.6, 0.7),
    ('Myrtilles', 'Fruits', 'coach', 57, 0.7, 11.0, 0.3),
    ('Raisin', 'Fruits', 'coach', 73, 0.7, 16.1, 0.2),
    ('Mangue', 'Fruits', 'coach', 63, 0.6, 13.7, 0.3),
    ('Ananas', 'Fruits', 'coach', 53, 0.5, 11.0, 0.2),
    ('Pêche', 'Fruits', 'coach', 43, 0.8, 9.0, 0.2),
    ('Abricot', 'Fruits', 'coach', 44, 0.9, 9.0, 0.2),
    ('Cerises', 'Fruits', 'coach', 60, 1.0, 12.5, 0.3),
    ('Melon', 'Fruits', 'coach', 34, 0.8, 7.0, 0.2),
    ('Pastèque', 'Fruits', 'coach', 30, 0.6, 7.0, 0.2),
    ('Avocat', 'Fruits', 'coach', 160, 2.0, 1.0, 15.0),
    ('Compote sans sucre ajouté', 'Fruits', 'coach', 58, 0.3, 12.5, 0.2),
    ('Dattes séchées', 'Fruits secs', 'coach', 282, 2.5, 64.0, 0.4),
    ('Abricots secs', 'Fruits secs', 'coach', 250, 3.4, 53.0, 0.6),
    ('Raisins secs', 'Fruits secs', 'coach', 300, 3.0, 68.0, 0.5),
    ('Pruneaux', 'Fruits secs', 'coach', 240, 2.2, 55.0, 0.4),
    ('Figues sèches', 'Fruits secs', 'coach', 250, 3.3, 55.0, 1.0),
    ('Brocoli cuit', 'Légumes', 'coach', 29, 2.9, 2.0, 0.4),
    ('Courgette cuite', 'Légumes', 'coach', 17, 1.2, 2.2, 0.3),
    ('Haricots verts cuits', 'Légumes', 'coach', 29, 2.0, 4.0, 0.2),
    ('Épinards cuits', 'Légumes', 'coach', 23, 3.0, 1.0, 0.5),
    ('Carottes crues', 'Légumes', 'coach', 36, 0.8, 7.6, 0.3),
    ('Carottes cuites', 'Légumes', 'coach', 26, 0.6, 5.0, 0.2),
    ('Tomate', 'Légumes', 'coach', 19, 0.8, 2.9, 0.3),
    ('Concombre', 'Légumes', 'coach', 13, 0.6, 2.0, 0.1),
    ('Salade verte', 'Légumes', 'coach', 15, 1.3, 1.4, 0.2),
    ('Poivron rouge', 'Légumes', 'coach', 29, 1.0, 5.3, 0.3),
    ('Champignons de Paris', 'Légumes', 'coach', 21, 2.9, 0.5, 0.3),
    ('Oignon', 'Légumes', 'coach', 36, 1.2, 7.0, 0.2),
    ('Chou-fleur cuit', 'Légumes', 'coach', 22, 1.9, 2.1, 0.4),
    ('Petits pois cuits', 'Légumes', 'coach', 80, 5.4, 11.0, 0.5),
    ('Maïs doux', 'Légumes', 'coach', 95, 2.9, 17.0, 1.2),
    ('Aubergine cuite', 'Légumes', 'coach', 26, 1.0, 4.0, 0.2),
    ('Poireau cuit', 'Légumes', 'coach', 25, 1.0, 4.5, 0.2),
    ('Betterave cuite', 'Légumes', 'coach', 45, 1.7, 8.6, 0.1),
    ('Chou rouge', 'Légumes', 'coach', 29, 1.4, 4.6, 0.2),
    ('Asperges cuites', 'Légumes', 'coach', 22, 2.4, 2.0, 0.2),
    ('Courge butternut cuite', 'Légumes', 'coach', 40, 1.0, 9.0, 0.1),
    ('Céleri branche', 'Légumes', 'coach', 15, 0.7, 2.0, 0.2),
    ('Radis', 'Légumes', 'coach', 14, 0.7, 2.0, 0.1),
    ('Mâche', 'Légumes', 'coach', 21, 2.0, 1.6, 0.4),
    ('Ratatouille', 'Plats préparés', 'coach', 65, 1.3, 6.0, 3.8),
    ('Soupe de légumes', 'Plats préparés', 'coach', 32, 1.0, 5.0, 0.8),
    ('Gaspacho', 'Plats préparés', 'coach', 40, 0.8, 4.5, 2.0),
    ('Huile d''olive', 'Matières grasses', 'coach', 900, 0.0, 0.0, 100.0),
    ('Huile de colza', 'Matières grasses', 'coach', 900, 0.0, 0.0, 100.0),
    ('Margarine', 'Matières grasses', 'coach', 540, 0.2, 0.5, 60.0),
    ('Amandes', 'Oléagineux', 'coach', 620, 25.0, 8.8, 53.0),
    ('Noix', 'Oléagineux', 'coach', 700, 15.0, 7.0, 65.0),
    ('Noix de cajou', 'Oléagineux', 'coach', 590, 18.0, 27.0, 46.0),
    ('Noisettes', 'Oléagineux', 'coach', 650, 15.0, 7.0, 61.0),
    ('Cacahuètes grillées', 'Oléagineux', 'coach', 600, 25.0, 12.0, 49.0),
    ('Beurre de cacahuète', 'Oléagineux', 'coach', 620, 24.0, 14.0, 51.0),
    ('Purée d''amande', 'Oléagineux', 'coach', 630, 22.0, 9.0, 55.0),
    ('Graines de chia', 'Graines', 'coach', 490, 17.0, 8.0, 31.0),
    ('Graines de lin', 'Graines', 'coach', 530, 20.0, 2.0, 42.0),
    ('Graines de courge', 'Graines', 'coach', 570, 30.0, 5.0, 46.0),
    ('Mayonnaise', 'Sauces', 'coach', 700, 1.2, 1.5, 77.0),
    ('Vinaigrette', 'Sauces', 'coach', 420, 0.5, 5.0, 44.0),
    ('Ketchup', 'Sauces', 'coach', 110, 1.3, 25.0, 0.2),
    ('Moutarde', 'Sauces', 'coach', 150, 7.0, 5.0, 11.0),
    ('Sauce soja', 'Sauces', 'coach', 60, 8.0, 6.0, 0.1),
    ('Pesto', 'Sauces', 'coach', 470, 5.0, 6.0, 47.0),
    ('Houmous', 'Sauces', 'coach', 320, 7.5, 12.0, 26.0),
    ('Sauce tomate', 'Sauces', 'coach', 45, 1.5, 7.0, 1.0),
    ('Miel', 'Produits sucrés', 'coach', 327, 0.4, 81.0, 0.0),
    ('Confiture', 'Produits sucrés', 'coach', 250, 0.4, 61.0, 0.1),
    ('Sucre', 'Produits sucrés', 'coach', 400, 0.0, 100.0, 0.0),
    ('Chocolat noir 70 %', 'Produits sucrés', 'coach', 580, 8.0, 33.0, 43.0),
    ('Chocolat au lait', 'Produits sucrés', 'coach', 545, 7.0, 57.0, 31.0),
    ('Pâte à tartiner cacao noisette', 'Produits sucrés', 'coach', 540, 6.0, 57.0, 31.0),
    ('Biscuits secs', 'Produits sucrés', 'coach', 450, 7.0, 74.0, 13.0),
    ('Croissant', 'Viennoiseries', 'coach', 420, 8.0, 46.0, 22.0),
    ('Pain au chocolat', 'Viennoiseries', 'coach', 420, 7.5, 48.0, 22.0),
    ('Brioche', 'Viennoiseries', 'coach', 360, 8.5, 52.0, 13.0),
    ('Barre de céréales', 'Produits sucrés', 'coach', 400, 6.0, 70.0, 10.0),
    ('Glace vanille', 'Produits sucrés', 'coach', 200, 3.5, 24.0, 10.0),
    ('Compote de pommes sucrée', 'Produits sucrés', 'coach', 80, 0.3, 19.0, 0.2),
    ('Crêpe nature', 'Produits sucrés', 'coach', 210, 6.5, 28.0, 8.0),
    ('Gâteau au chocolat', 'Produits sucrés', 'coach', 420, 6.0, 48.0, 23.0),
    ('Jus d''orange 100 %', 'Boissons', 'coach', 45, 0.7, 10.0, 0.1),
    ('Café noir', 'Boissons', 'coach', 2, 0.1, 0.3, 0.0),
    ('Thé', 'Boissons', 'coach', 1, 0.0, 0.2, 0.0),
    ('Soda', 'Boissons', 'coach', 42, 0.0, 10.6, 0.0),
    ('Bière', 'Boissons', 'coach', 43, 0.4, 3.5, 0.0),
    ('Vin rouge', 'Boissons', 'coach', 85, 0.1, 2.6, 0.0),
    ('Eau gazeuse', 'Boissons', 'coach', 0, 0.0, 0.0, 0.0),
    ('Boisson isotonique', 'Boissons', 'coach', 25, 0.0, 6.0, 0.0),
    ('Pizza margherita', 'Plats préparés', 'coach', 250, 10.0, 31.0, 9.0),
    ('Lasagnes bolognaises', 'Plats préparés', 'coach', 150, 8.0, 13.0, 7.0),
    ('Quiche lorraine', 'Plats préparés', 'coach', 270, 9.0, 18.0, 18.0),
    ('Hachis parmentier', 'Plats préparés', 'coach', 120, 6.5, 10.0, 6.0),
    ('Chili con carne', 'Plats préparés', 'coach', 110, 8.0, 9.0, 4.5),
    ('Couscous poulet', 'Plats préparés', 'coach', 140, 9.0, 15.0, 4.5),
    ('Sushi saumon', 'Plats préparés', 'coach', 150, 6.0, 26.0, 2.5),
    ('Sandwich jambon beurre', 'Plats préparés', 'coach', 260, 11.0, 34.0, 9.0),
    ('Wrap poulet crudités', 'Plats préparés', 'coach', 190, 10.0, 22.0, 6.5),
    ('Taboulé', 'Plats préparés', 'coach', 150, 3.5, 20.0, 6.0),
    ('Salade César', 'Plats préparés', 'coach', 160, 9.0, 6.0, 11.0),
    ('Burger', 'Plats préparés', 'coach', 250, 13.0, 24.0, 11.5),
    ('Whey protéine', 'Compléments', 'coach', 380, 78.0, 7.0, 5.0),
    ('Caséine', 'Compléments', 'coach', 360, 80.0, 4.0, 1.5),
    ('Barre protéinée', 'Compléments', 'coach', 360, 30.0, 35.0, 11.0),
    ('Gel énergétique', 'Compléments', 'coach', 280, 0.0, 70.0, 0.0),
    ('Créatine monohydrate', 'Compléments', 'coach', 0, 0.0, 0.0, 0.0),
    ('Pancakes protéinés', 'Compléments', 'coach', 220, 18.0, 24.0, 5.5);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Force bas du corps', 'Prise de force', 'intermediaire', 8, 3, 'Squat et chaîne postérieure, progression linéaire.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Squat', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Squat barre'), 0, 4, '6', 50, 7, 180, 'Descendre sous la parallèle si le genou le permet'), (v_ts, (select id from exercises where name_fr = 'Fentes avant'), 1, 3, '10', 12, 7, 90, 'Contrôler la descente'), (v_ts, (select id from exercises where name_fr = 'Hip thrust'), 2, 3, '10', 60, 7, 90, null), (v_ts, (select id from exercises where name_fr = 'Gainage'), 3, 3, '45 s', null, null, 45, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Soulevé de terre', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Soulevé de terre roumain'), 0, 4, '8', 50, 7, 150, 'Dos neutre'), (v_ts, (select id from exercises where name_fr = 'Presse à cuisses'), 1, 3, '12', 100, 7, 120, null), (v_ts, (select id from exercises where name_fr = 'Leg curl allongé'), 2, 3, '12', 30, 8, 90, null), (v_ts, (select id from exercises where name_fr = 'Mollets debout'), 3, 3, '15', 40, 8, 60, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Full body débutant', 'Remise en forme', 'debutant', 6, 2, 'Apprentissage des mouvements de base.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Full body 1', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Goblet squat'), 0, 3, '12', 12, 6, 90, 'Charge légère, technique d''abord'), (v_ts, (select id from exercises where name_fr = 'Pompes inclinées'), 1, 3, '10', null, 7, 90, null), (v_ts, (select id from exercises where name_fr = 'Rowing haltère'), 2, 3, '12', 12, 7, 90, null), (v_ts, (select id from exercises where name_fr = 'Fentes avant'), 3, 2, '10', 6, 6, 90, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Full body 2', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Step-up'), 0, 3, '10', 8, 6, 90, null), (v_ts, (select id from exercises where name_fr = 'Développé haltères'), 1, 3, '10', 10, 7, 90, null), (v_ts, (select id from exercises where name_fr = 'Tirage vertical'), 2, 3, '12', 30, 7, 90, null), (v_ts, (select id from exercises where name_fr = 'Dead bug'), 3, 3, '10', null, null, 45, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Hypertrophie haut / bas', 'Prise de muscle', 'intermediaire', 8, 4, 'Volume modéré, RPE 7 à 9.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Haut du corps', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Développé couché'), 0, 4, '8', 60, 8, 120, null), (v_ts, (select id from exercises where name_fr = 'Rowing barre'), 1, 4, '10', 50, 8, 120, null), (v_ts, (select id from exercises where name_fr = 'Développé épaules haltères'), 2, 3, '10', 16, 8, 90, null), (v_ts, (select id from exercises where name_fr = 'Curl biceps haltères'), 3, 3, '12', 10, 8, 60, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Bas du corps', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Squat barre'), 0, 4, '8', 70, 8, 150, null), (v_ts, (select id from exercises where name_fr = 'Soulevé de terre roumain'), 1, 3, '10', 60, 8, 120, null), (v_ts, (select id from exercises where name_fr = 'Leg extension'), 2, 3, '12', 40, 8, 60, null), (v_ts, (select id from exercises where name_fr = 'Mollets assis'), 3, 3, '15', 30, 8, 60, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'HIIT + renforcement', 'Perte de poids', 'debutant', 6, 3, 'Circuits courts et dépense énergétique.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Circuit 1', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Kettlebell swing'), 0, 4, '15', 12, 7, 60, null), (v_ts, (select id from exercises where name_fr = 'Mountain climbers'), 1, 4, '30 s', null, 7, 30, null), (v_ts, (select id from exercises where name_fr = 'Goblet squat'), 2, 4, '12', 10, 7, 60, null), (v_ts, (select id from exercises where name_fr = 'Burpees'), 3, 3, '10', null, 8, 60, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Circuit 2', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Rameur'), 0, 5, '250 m', null, 8, 60, null), (v_ts, (select id from exercises where name_fr = 'Pompes'), 1, 3, '10', null, 7, 60, null), (v_ts, (select id from exercises where name_fr = 'Fentes marchées'), 2, 3, '12', 6, 7, 60, null), (v_ts, (select id from exercises where name_fr = 'Gainage'), 3, 3, '40 s', null, null, 40, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Course semi-marathon', 'Course à pied', 'intermediaire', 10, 3, 'Préparation semi-marathon en 10 semaines.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Sortie longue', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Sortie longue'), 0, 1, '1 h 10', null, 6, null, 'Rester en aisance respiratoire');
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Fractionné', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Course allure facile'), 0, 1, '15 min', null, 5, null, 'Échauffement'), (v_ts, (select id from exercises where name_fr = 'Fractionné 400 m'), 1, 8, '1', null, 8, 90, 'Allure 10 km');
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'C', 'Renfort coureur', 2) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Squat bulgare'), 0, 3, '10', 8, 7, 60, null), (v_ts, (select id from exercises where name_fr = 'Mollets debout'), 1, 3, '15', 20, 7, 45, null), (v_ts, (select id from exercises where name_fr = 'Gainage latéral'), 2, 3, '30 s', null, null, 30, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Hyrox', 'Hyrox', 'confirme', 8, 4, 'Stations Hyrox et course.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Stations', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'SkiErg'), 0, 4, '500 m', null, 8, 90, null), (v_ts, (select id from exercises where name_fr = 'Sled push'), 1, 4, '25 m', 120, 8, 120, null), (v_ts, (select id from exercises where name_fr = 'Wall balls'), 2, 4, '20', 9, 8, 60, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Course et fentes', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Tempo run'), 0, 1, '20 min', null, 7, null, null), (v_ts, (select id from exercises where name_fr = 'Sandbag lunges'), 1, 4, '20 m', 20, 8, 90, null), (v_ts, (select id from exercises where name_fr = 'Burpee broad jump'), 2, 3, '10', null, 8, 90, null);
  insert into program_templates (coach_id, name, goal, level, weeks, sessions_per_week, description) values (v_karim, 'Mobilité et dos', 'Mobilité et dos', 'debutant', 6, 2, 'Mobilité, gainage, pas de charge lourde sur la colonne.') returning id into v_tpl;
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'A', 'Mobilité', 0) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Chat-vache'), 0, 2, '10', null, null, 30, null), (v_ts, (select id from exercises where name_fr = 'Mobilité hanches 90/90'), 1, 2, '8', null, null, 30, null), (v_ts, (select id from exercises where name_fr = 'Bird dog'), 2, 3, '10', null, null, 45, null), (v_ts, (select id from exercises where name_fr = 'Respiration diaphragmatique'), 3, 2, '2 min', null, null, null, null);
  insert into template_sessions (template_id, label, name, position) values (v_tpl, 'B', 'Renfort dos', 1) returning id into v_ts;
  insert into template_exercises (template_session_id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne) values (v_ts, (select id from exercises where name_fr = 'Pont fessier'), 0, 3, '12', null, 6, 60, null), (v_ts, (select id from exercises where name_fr = 'Pallof press'), 1, 3, '10', null, 6, 60, null), (v_ts, (select id from exercises where name_fr = 'Tirage horizontal'), 2, 3, '12', 25, 6, 60, null), (v_ts, (select id from exercises where name_fr = 'Gainage latéral'), 3, 3, '30 s', null, null, 30, null);
  insert into meal_plan_templates (coach_id, name, goal, kcal_target, description, meals) values
    (v_karim, 'Prise de force', 'Prise de force', 2100, 'Riche en protéines, glucides autour des séances.', '[{"repas": "Petit-déjeuner", "contenu": ["Flocons d''avoine 60 g", "Skyr 150 g", "Banane"]}, {"repas": "Déjeuner", "contenu": ["Riz basmati 200 g", "Blanc de poulet 150 g", "Légumes verts"]}, {"repas": "Collation", "contenu": ["Fromage blanc 3 % 200 g", "Amandes 20 g"]}, {"repas": "Dîner", "contenu": ["Patate douce 250 g", "Saumon 130 g", "Salade"]}]'::jsonb),
    (v_karim, 'Perte de poids douce', 'Perte de poids', 1600, 'Déficit modéré, volume de légumes élevé.', '[{"repas": "Petit-déjeuner", "contenu": ["Pain complet 60 g", "Œufs x2", "Kiwi"]}, {"repas": "Déjeuner", "contenu": ["Quinoa 150 g", "Escalope de dinde 120 g", "Crudités"]}, {"repas": "Collation", "contenu": ["Skyr 150 g"]}, {"repas": "Dîner", "contenu": ["Soupe de légumes", "Cabillaud 150 g", "Haricots verts"]}]'::jsonb),
    (v_karim, 'Sèche douce', 'Sèche', 1800, 'Protéines élevées, glucides ciblés.', '[{"repas": "Petit-déjeuner", "contenu": ["Skyr 200 g", "Flocons d''avoine 40 g", "Myrtilles"]}, {"repas": "Déjeuner", "contenu": ["Riz complet 150 g", "Bœuf haché 5 % 130 g", "Brocoli"]}, {"repas": "Collation", "contenu": ["Pomme", "Amandes 15 g"]}, {"repas": "Dîner", "contenu": ["Tofu ferme 150 g", "Légumes sautés", "Huile d''olive 10 g"]}]'::jsonb),
    (v_karim, 'Prise de masse', 'Prise de muscle', 2800, 'Surplus calorique propre, 4 repas.', '[{"repas": "Petit-déjeuner", "contenu": ["Flocons d''avoine 90 g", "Lait demi-écrémé 300 ml", "Beurre de cacahuète 20 g"]}, {"repas": "Déjeuner", "contenu": ["Pâtes 250 g", "Bœuf haché 15 % 150 g", "Sauce tomate"]}, {"repas": "Collation", "contenu": ["Pain complet 80 g", "Thon 100 g"]}, {"repas": "Dîner", "contenu": ["Riz 250 g", "Poulet 150 g", "Avocat"]}]'::jsonb),
    (v_karim, 'Végétarien équilibré', 'Équilibre', 2000, 'Sans viande ni poisson, protéines végétales et laitières.', '[{"repas": "Petit-déjeuner", "contenu": ["Muesli 60 g", "Yaourt grec", "Fruits rouges"]}, {"repas": "Déjeuner", "contenu": ["Lentilles 200 g", "Riz 120 g", "Crudités"]}, {"repas": "Collation", "contenu": ["Houmous 50 g", "Carottes"]}, {"repas": "Dîner", "contenu": ["Tempeh 120 g", "Quinoa 150 g", "Légumes rôtis"]}]'::jsonb),
    (v_karim, 'Endurance', 'Course à pied', 2400, 'Glucides adaptés au volume de course.', '[{"repas": "Petit-déjeuner", "contenu": ["Pain complet 100 g", "Miel 20 g", "Banane", "Œufs x2"]}, {"repas": "Déjeuner", "contenu": ["Pâtes complètes 250 g", "Poulet 120 g", "Courgettes"]}, {"repas": "Collation", "contenu": ["Dattes 40 g", "Skyr 150 g"]}, {"repas": "Dîner", "contenu": ["Patate douce 300 g", "Œufs x2", "Épinards"]}]'::jsonb);
  insert into recipes (coach_id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, ingredients, tags) values
    (v_karim, 'Porridge protéiné banane', 1, 450, 30, 62, 9, '[{"aliment": "Flocons d''avoine", "quantite": "60 g"}, {"aliment": "Lait demi-écrémé", "quantite": "250 ml"}, {"aliment": "Whey protéine", "quantite": "20 g"}, {"aliment": "Banane", "quantite": "1"}]'::jsonb, array['petit-déjeuner','rapide']::text[]),
    (v_karim, 'Bowl poulet riz brocoli', 1, 560, 45, 62, 12, '[{"aliment": "Riz basmati cuit", "quantite": "200 g"}, {"aliment": "Blanc de poulet cuit", "quantite": "150 g"}, {"aliment": "Brocoli cuit", "quantite": "150 g"}, {"aliment": "Huile d''olive", "quantite": "5 g"}]'::jsonb, array['déjeuner','prise de force']::text[]),
    (v_karim, 'Omelette épinards feta', 1, 380, 26, 4, 29, '[{"aliment": "Œuf entier", "quantite": "3"}, {"aliment": "Épinards cuits", "quantite": "100 g"}, {"aliment": "Feta", "quantite": "30 g"}]'::jsonb, array['dîner','faible en glucides']::text[]),
    (v_karim, 'Salade de lentilles', 2, 420, 22, 52, 12, '[{"aliment": "Lentilles cuites", "quantite": "300 g"}, {"aliment": "Tomate", "quantite": "2"}, {"aliment": "Feta", "quantite": "60 g"}, {"aliment": "Vinaigrette", "quantite": "20 g"}]'::jsonb, array['végétarien']::text[]),
    (v_karim, 'Saumon patate douce', 1, 590, 34, 52, 26, '[{"aliment": "Saumon cuit", "quantite": "130 g"}, {"aliment": "Patate douce cuite", "quantite": "250 g"}, {"aliment": "Haricots verts cuits", "quantite": "100 g"}]'::jsonb, array['dîner','oméga-3']::text[]),
    (v_karim, 'Chili sin carne', 4, 410, 21, 58, 9, '[{"aliment": "Haricots rouges cuits", "quantite": "400 g"}, {"aliment": "Riz complet cuit", "quantite": "400 g"}, {"aliment": "Poivron rouge", "quantite": "2"}, {"aliment": "Sauce tomate", "quantite": "400 g"}]'::jsonb, array['végétarien','batch cooking']::text[]),
    (v_karim, 'Wrap dinde avocat', 1, 470, 32, 40, 20, '[{"aliment": "Tortilla de blé", "quantite": "1"}, {"aliment": "Blanc de dinde tranché", "quantite": "80 g"}, {"aliment": "Avocat", "quantite": "1/2"}, {"aliment": "Salade verte", "quantite": "30 g"}]'::jsonb, array['déjeuner','rapide']::text[]),
    (v_karim, 'Skyr fruits rouges granola', 1, 290, 20, 38, 6, '[{"aliment": "Skyr nature", "quantite": "200 g"}, {"aliment": "Framboises", "quantite": "80 g"}, {"aliment": "Granola", "quantite": "30 g"}]'::jsonb, array['collation']::text[]),
    (v_karim, 'Pâtes bolognaise maison', 4, 620, 38, 72, 18, '[{"aliment": "Pâtes cuites", "quantite": "1 kg"}, {"aliment": "Bœuf haché 5 % cuit", "quantite": "500 g"}, {"aliment": "Sauce tomate", "quantite": "500 g"}]'::jsonb, array['prise de masse','batch cooking']::text[]),
    (v_karim, 'Curry tofu légumes', 3, 430, 22, 48, 16, '[{"aliment": "Tofu ferme", "quantite": "400 g"}, {"aliment": "Riz basmati cuit", "quantite": "450 g"}, {"aliment": "Courgette cuite", "quantite": "300 g"}]'::jsonb, array['végétarien']::text[]),
    (v_karim, 'Pancakes avoine', 2, 330, 18, 46, 8, '[{"aliment": "Flocons d''avoine", "quantite": "80 g"}, {"aliment": "Blanc d''œuf", "quantite": "150 g"}, {"aliment": "Banane", "quantite": "1"}]'::jsonb, array['petit-déjeuner']::text[]);

  -- 4. Copies personnalisées des programmes
  select client_id into v_client from demo_map where key = 'lea';
  if v_client is not null then perform _demo_copy_program(v_client, 'Force bas du corps', '["Charges calées sur son bilan", "Fentes remplacées par step-up (genou gauche)", "3 séances par semaine"]'::jsonb, 8, 5); end if;
  select client_id into v_client from demo_map where key = 'tom';
  if v_client is not null then perform _demo_copy_program(v_client, 'Full body débutant', '["Charges légères de reprise", "Genou droit : pas de fentes profondes"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'yanis';
  if v_client is not null then perform _demo_copy_program(v_client, 'Hypertrophie haut / bas', '["Charges calées sur son bilan"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'ines';
  if v_client is not null then perform _demo_copy_program(v_client, 'HIIT + renforcement', '["Charges calées sur son bilan"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'hugo';
  if v_client is not null then perform _demo_copy_program(v_client, 'Course semi-marathon', '["Charges calées sur son bilan"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'camille';
  if v_client is not null then perform _demo_copy_program(v_client, 'Mobilité et dos', '["Dos : pas de charge lourde sur la colonne"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'sarah';
  if v_client is not null then perform _demo_copy_program(v_client, 'Full body débutant', '["2 séances par semaine"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'malik';
  if v_client is not null then perform _demo_copy_program(v_client, 'Hyrox', '["Charges calées sur son bilan"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'julie';
  if v_client is not null then perform _demo_copy_program(v_client, 'Full body débutant', '["Charges calées sur son bilan"]'::jsonb, 6, 3); end if;
  select client_id into v_client from demo_map where key = 'theo';
  if v_client is not null then perform _demo_copy_program(v_client, 'Hypertrophie haut / bas', '["Épaule droite : pas de développé militaire"]'::jsonb, 6, 3); end if;

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
    insert into weight_logs (client_id, date, weight_kg, source) values (v_client, v_base - 14, 62.4, 'manuel'), (v_client, v_base - 7, 62.1, 'manuel'), (v_client, v_base, 62.0, 'manuel');
    insert into food_log_entries (client_id, date, meal, food_id, quantity, kcal, protein_g, carbs_g, fat_g) values
      (v_client, v_base, 'petit_dejeuner', (select id from foods where name = 'Flocons d''avoine'), 50, 185.0, 6.8, 29.4, 3.5),
      (v_client, v_base, 'petit_dejeuner', (select id from foods where name = 'Lait demi-écrémé'), 200, 92.0, 6.6, 9.6, 3.2),
      (v_client, v_base, 'petit_dejeuner', (select id from foods where name = 'Banane'), 120, 108.0, 1.3, 24.6, 0.4),
      (v_client, v_base, 'dejeuner', (select id from foods where name = 'Riz basmati cuit'), 150, 181.5, 4.5, 37.8, 0.6),
      (v_client, v_base, 'dejeuner', (select id from foods where name = 'Blanc de poulet cuit'), 120, 145.2, 30.6, 0.0, 2.4),
      (v_client, v_base, 'dejeuner', (select id from foods where name = 'Brocoli cuit'), 150, 43.5, 4.3, 3.0, 0.6),
      (v_client, v_base, 'dejeuner', (select id from foods where name = 'Huile d''olive'), 5, 45.0, 0.0, 0.0, 5.0),
      (v_client, v_base, 'collation', (select id from foods where name = 'Skyr nature'), 150, 93.0, 15.8, 6.0, 0.3),
      (v_client, v_base, 'collation', (select id from foods where name = 'Amandes'), 61.7, 382.8, 15.4, 5.4, 32.7);
    update food_log_entries set coach_comment = 'Bien pour les protéines ! Ajoute une collation glucidique avant la séance.' where client_id = v_client and date = v_base and meal = 'dejeuner' and food_id = (select id from foods where name = 'Blanc de poulet cuit');
    insert into integrations (user_id, provider, status, connected_at, last_sync_at, shared_scopes)
      select profile_id, 'strava', 'connected', now() - interval '20 days', now() - interval '2 hours', '{"visible_coach": false}'::jsonb from demo_map where key = 'lea';
    insert into integrations (user_id, provider, status) select profile_id, p, 'disconnected' from demo_map, unnest(array['withings', 'garmin', 'apple_sante', 'health_connect', 'whoop']) p where key = 'lea';
  end if;

  -- 6. Retours de séance (dernière séance faite de chaque coaché) et messages
  select client_id into v_client from demo_map where key = 'lea';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' and week = 5 and label = 'A' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 6, 'facile', null, 'Squat facile, j''aurais pu mettre +5 kg', done_at + interval '25 minutes', null from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'lea'), 'Retour envoyé : ' || name || ' — RPE 6', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 6), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'tom';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 7, 'douleur', 'genou droit', 'Gêne au genou droit sur les fentes, j’ai arrêté à la 2e série.', done_at + interval '25 minutes', null from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'tom'), 'Retour envoyé : ' || name || ' — RPE 7', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 7), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'yanis';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 9, 'difficile', null, 'Développé couché trop lourd, je n’ai pas fini la dernière série.', done_at + interval '25 minutes', null from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'yanis'), 'Retour envoyé : ' || name || ' — RPE 9', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 9), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'ines';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 5, 'facile', null, 'Circuit trop facile, je peux monter.', done_at + interval '25 minutes', null from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'ines'), 'Retour envoyé : ' || name || ' — RPE 5', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 5), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'hugo';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 7, 'correct', null, 'Sortie longue OK, tendon RAS.', done_at + interval '25 minutes', null from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'hugo'), 'Retour envoyé : ' || name || ' — RPE 7', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 7), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'malik';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 8, 'correct', null, 'Wall balls difficiles mais terminés.', done_at + interval '25 minutes', done_at + interval '5 hours' from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'malik'), 'Retour envoyé : ' || name || ' — RPE 8', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 8), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'camille';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 4, 'correct', null, 'Dos détendu après la séance.', done_at + interval '25 minutes', done_at + interval '5 hours' from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'camille'), 'Retour envoyé : ' || name || ' — RPE 4', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 4), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'julie';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 6, 'correct', null, 'Bonne séance.', done_at + interval '25 minutes', done_at + interval '5 hours' from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'julie'), 'Retour envoyé : ' || name || ' — RPE 6', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 6), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'theo';
  if v_client is not null then
    select id into v_sess from client_sessions where client_id = v_client and status = 'done' order by date desc, label limit 1;
    if v_sess is not null then
      insert into session_feedback (client_session_id, client_id, rpe, feeling, pain_zone, note, created_at, handled_at)
      select v_sess, v_client, 8, 'correct', null, 'Squat solide.', done_at + interval '25 minutes', done_at + interval '5 hours' from client_sessions where id = v_sess;
      insert into messages (client_id, sender, sender_id, body, kind, payload, created_at)
      select v_client, 'coache', (select profile_id from demo_map where key = 'theo'), 'Retour envoyé : ' || name || ' — RPE 8', 'event', jsonb_build_object('type', 'retour', 'session_id', id, 'rpe', 8), done_at + interval '25 minutes' from client_sessions where id = v_sess;
    end if;
  end if;
  select client_id into v_client from demo_map where key = 'lea';
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
  end if;

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
  end if;

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
end $$;
revoke all on function public.seed_demo() from public, anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function public.seed_demo() to service_role; end if; end $$;

-- Réservé au coach connecté : remet la démo à zéro avant la soutenance.
create or replace function public.reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then
    raise exception 'Seul le coach peut réinitialiser la démo.' using errcode = '42501';
  end if;
  perform public.seed_demo();
end $$;
revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;
