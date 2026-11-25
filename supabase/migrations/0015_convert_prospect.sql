-- La Tanière Coach — 0015 : « Convertir en coachée » (Sprint 3, US11)
-- Un prospect n'a pas de compte : clients.profile_id → profiles.id → auth.users.id.
-- Cette fonction crée en une transaction : l'utilisateur auth minimal (sans mot de passe, invitation plus tard),
-- le profil coaché, la fiche client rattachée au coach, puis la copie personnalisée du modèle
-- (même logique que assignTemplate de src/lib/programmes/assign.ts : toutes les semaines du modèle,
-- à partir du lundi de la semaine prochaine, jours répartis lun/jeu, lun/mer/ven…).
-- Elle passe le booking à « converti », renseigne intake_forms.converted_client_id, ajoute un message
-- événement « Nouveau programme : … » dans le fil, et renvoie l'id du client_program (redirection vers l'éditeur).

create or replace function public.convert_prospect(p_booking_id uuid, p_template_id uuid, p_adaptations jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach     uuid := auth.uid();
  v_booking   public.bookings;
  v_intake    public.intake_forms;
  v_tpl       public.program_templates;
  v_answers   jsonb;
  v_name      text;
  v_initials  text;
  v_email     text;
  v_level     text;
  v_injuries  text;
  v_weight    numeric;
  v_user      uuid := gen_random_uuid();
  v_client    uuid;
  v_prog      uuid;
  v_start     date;
  v_nsess     int;
  v_offsets   int[];
  v_ts        record;
  v_te        record;
  v_sess      uuid;
  v_se        uuid;
  v_idx       int;
  k           int;
  i           int;
begin
  if v_coach is null or not public.is_coach() then
    raise exception 'Réservé au coach connecté.' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null or v_booking.coach_id <> v_coach then
    raise exception 'Bilan introuvable.' using errcode = 'P0001';
  end if;
  if v_booking.status = 'converti' then
    raise exception 'Ce prospect a déjà été converti.' using errcode = 'P0001';
  end if;
  if v_booking.status = 'annule' then
    raise exception 'Ce bilan a été annulé.' using errcode = 'P0001';
  end if;

  select * into v_intake from public.intake_forms where booking_id = p_booking_id order by created_at desc limit 1 for update;
  if v_intake.converted_client_id is not null then
    raise exception 'Ce prospect a déjà été converti.' using errcode = 'P0001';
  end if;

  select * into v_tpl from public.program_templates where id = p_template_id;
  if v_tpl.id is null or v_tpl.coach_id <> v_coach then
    raise exception 'Modèle introuvable.' using errcode = 'P0001';
  end if;
  select count(*) into v_nsess from public.template_sessions where template_id = v_tpl.id;
  if v_nsess = 0 then
    raise exception 'Ce modèle n''a pas encore de séance.' using errcode = 'P0001';
  end if;

  if p_adaptations is null or jsonb_typeof(p_adaptations) <> 'array' then
    p_adaptations := '[]'::jsonb;
  end if;

  -- Données du questionnaire et des tests
  v_answers  := coalesce(v_intake.answers, '{}'::jsonb);
  v_name     := trim(v_booking.full_name);
  v_initials := upper(coalesce(
    (select string_agg(left(w, 1), '' order by n) from (
       select w, n from unnest(regexp_split_to_array(v_name, '\s+')) with ordinality as t(w, n) where w <> '' limit 2) s),
    left(v_name, 1)));
  v_email    := nullif(lower(trim(v_booking.email)), '');
  v_level    := case when v_answers->>'niveau' in ('debutant', 'intermediaire', 'confirme') then v_answers->>'niveau' end;
  v_injuries := nullif(trim(v_answers->>'douleurs'), '');
  if v_injuries is not null and lower(v_injuries) in ('aucune', 'aucun', 'non', 'rien', 'ras', 'néant', 'neant') then
    v_injuries := null;
  end if;
  begin
    v_weight := nullif(v_intake.tests->>'poids_kg', '')::numeric;
  exception when others then
    v_weight := null;
  end;

  if v_email is not null and exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Un compte existe déjà avec l''e-mail %.', v_email using errcode = 'P0001';
  end if;

  -- 1. Utilisateur auth minimal : pas de mot de passe ni d'identité, l'invitation se fera plus tard.
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
          '{"provider": "email", "providers": ["email"]}'::jsonb,
          jsonb_build_object('full_name', v_name, 'role', 'coache', 'converted_from_booking', p_booking_id),
          now(), now());

  -- 2. Profil et fiche client rattachés au coach
  insert into public.profiles (id, role, full_name, initials, email, coach_id)
  values (v_user, 'coache', v_name, v_initials, v_email, v_coach);

  insert into public.clients (profile_id, coach_id, goal, level, sessions_per_week, injuries, weight_kg, status, since)
  values (v_user, v_coach, nullif(trim(v_answers->>'objectif'), ''), v_level, v_nsess, v_injuries,
          case when v_weight between 20 and 400 then round(v_weight, 1) end, 'actif', current_date)
  returning id into v_client;

  -- 3. Copie personnalisée du modèle (le modèle n'est jamais modifié)
  v_start := (date_trunc('week', (now() at time zone 'Europe/Paris')::date) + interval '7 days')::date;
  v_offsets := case v_nsess
    when 1 then array[0] when 2 then array[0, 3] when 3 then array[0, 2, 4] when 4 then array[0, 1, 3, 4]
    when 5 then array[0, 1, 2, 3, 4] when 6 then array[0, 1, 2, 3, 4, 5]
    else (select array_agg(least(6, (g * 7) / v_nsess) order by g) from generate_series(0, v_nsess - 1) g) end;

  insert into public.client_programs (client_id, template_id, name, adaptations, start_date, active)
  values (v_client, v_tpl.id, v_tpl.name, p_adaptations, v_start, true)
  returning id into v_prog;

  for k in 1 .. greatest(1, coalesce(v_tpl.weeks, 1)) loop
    v_idx := 0;
    for v_ts in select * from public.template_sessions where template_id = v_tpl.id order by position, label loop
      v_idx := v_idx + 1;
      insert into public.client_sessions (client_program_id, client_id, label, name, week, date, status)
      values (v_prog, v_client, v_ts.label, v_ts.name, k, v_start + (k - 1) * 7 + coalesce(v_offsets[v_idx], v_idx - 1), 'planned')
      returning id into v_sess;
      i := 0;
      for v_te in select * from public.template_exercises where template_session_id = v_ts.id order by position loop
        insert into public.session_exercises (client_session_id, client_id, exercise_id, position, consigne, rest_s)
        values (v_sess, v_client, v_te.exercise_id, i, v_te.consigne, v_te.rest_s)
        returning id into v_se;
        i := i + 1;
        insert into public.sets (session_exercise_id, client_id, set_number, target_reps, target_load_kg, target_rpe)
        select v_se, v_client, n, nullif(substring(v_te.reps from '^\s*(\d+)'), '')::smallint, v_te.load_kg, v_te.target_rpe
        from generate_series(1, greatest(1, v_te.sets)) n;
      end loop;
    end loop;
  end loop;

  -- 4. Le prospect est converti
  update public.bookings set status = 'converti' where id = p_booking_id;
  update public.intake_forms set converted_client_id = v_client where id = v_intake.id;

  -- 5. Message événement dans le fil de la nouvelle coachée
  insert into public.messages (client_id, sender, sender_id, body, kind, payload)
  values (v_client, 'coach', v_coach, 'Nouveau programme : ' || v_tpl.name, 'event',
          jsonb_build_object('type', 'program_assigned', 'client_program_id', v_prog, 'template_id', v_tpl.id,
                             'start_date', v_start, 'weeks', v_tpl.weeks, 'sessions_per_week', v_nsess,
                             'source', 'bilan', 'booking_id', p_booking_id));

  return v_prog;
end $$;

revoke execute on function public.convert_prospect(uuid, uuid, jsonb) from public, anon;
grant execute on function public.convert_prospect(uuid, uuid, jsonb) to authenticated;
