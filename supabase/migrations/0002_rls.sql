-- La Tanière Coach — 0002 : Row Level Security
-- Règles :
--   • le coach voit et modifie ses coachés et toutes leurs données ;
--   • un coaché ne voit que SES données (jamais les notes privées du coach, jamais un autre coaché) ;
--   • catalogues (exercices, aliments, modèles, recettes, plans types) : lecture pour tout compte connecté, écriture coach ;
--   • parcours prospect (anon) : créer une réservation et un questionnaire, lire les créneaux libres ;
--   • Strava n'est jamais lisible par le coach.

-- ---------------------------------------------------------------- fonctions d'aide
-- SECURITY DEFINER : elles lisent profiles/clients sans repasser par la RLS (évite la récursion).
create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

create or replace function public.my_coach_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case when p.role = 'coach' then p.id else p.coach_id end
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.clients c where c.profile_id = auth.uid();
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.coach_owns_client(p_client_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients c where c.id = p_client_id and c.coach_id = auth.uid());
$$;

create or replace function public.can_access_client(p_client_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.coach_owns_client(p_client_id) or p_client_id = public.my_client_id();
$$;

-- ---------------------------------------------------------------- droits de base
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.bookings, public.intake_forms to anon;
grant select on public.availability_slots, public.app_config to anon;
grant execute on function public.is_coach(), public.my_coach_id(), public.my_client_id(), public.my_role(),
  public.coach_owns_client(uuid), public.can_access_client(uuid) to authenticated;

-- Activer la RLS sur toutes les tables du schéma public
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------- profils et coachés
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or coach_id = auth.uid() or id = public.my_coach_id());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

create policy clients_select on public.clients for select to authenticated
  using (coach_id = auth.uid() or profile_id = auth.uid());
create policy clients_coach_write on public.clients for all to authenticated
  using (coach_id = auth.uid() and public.is_coach())
  with check (coach_id = auth.uid() and public.is_coach());

create policy coach_notes_coach_only on public.coach_notes for all to authenticated
  using (coach_id = auth.uid() and public.coach_owns_client(client_id))
  with check (coach_id = auth.uid() and public.coach_owns_client(client_id));

-- ---------------------------------------------------------------- données d'un coaché
-- Le coach a tous les droits sur les lignes de ses coachés ; le coaché lit les siennes.
do $$
declare t text;
begin
  foreach t in array array[
    'client_programs', 'client_sessions', 'session_exercises', 'sets', 'session_feedback', 'messages',
    'nutrition_goals', 'client_meal_plans', 'food_log_entries', 'supplements', 'supplement_intakes',
    'shopping_items', 'weight_logs', 'activities', 'subscriptions', 'invoices'
  ] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.coach_owns_client(client_id)) with check (public.coach_owns_client(client_id))', t || '_coach_all', t);
    execute format('create policy %I on public.%I for select to authenticated using (client_id = public.my_client_id())', t || '_self_select', t);
  end loop;
end $$;

-- Écritures autorisées au coaché sur ses propres lignes
create policy client_sessions_self_update on public.client_sessions for update to authenticated
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());
create policy sets_self_update on public.sets for update to authenticated
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());
create policy session_feedback_self_insert on public.session_feedback for insert to authenticated
  with check (client_id = public.my_client_id());
create policy messages_self_insert on public.messages for insert to authenticated
  with check (client_id = public.my_client_id() and sender = 'coache' and sender_id = auth.uid());
create policy messages_self_read_mark on public.messages for update to authenticated
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

do $$
declare t text;
begin
  foreach t in array array['food_log_entries', 'supplement_intakes', 'shopping_items', 'weight_logs', 'activities'] loop
    execute format('create policy %I on public.%I for all to authenticated using (client_id = public.my_client_id()) with check (client_id = public.my_client_id())', t || '_self_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- catalogues partagés
do $$
declare t text;
begin
  foreach t in array array['exercises', 'foods', 'template_sessions', 'template_exercises'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_coach()) with check (public.is_coach())', t || '_coach_write', t);
  end loop;
  foreach t in array array['program_templates', 'recipes', 'meal_plan_templates'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (coach_id = auth.uid() and public.is_coach()) with check (coach_id = auth.uid() and public.is_coach())', t || '_coach_write', t);
  end loop;
end $$;

create policy app_config_read on public.app_config for select to anon, authenticated using (true);
create policy app_config_coach_write on public.app_config for update to authenticated using (public.is_coach()) with check (public.is_coach());

-- ---------------------------------------------------------------- parcours prospect
create policy slots_public_free on public.availability_slots for select to anon, authenticated
  using (is_booked = false);
create policy slots_coach_all on public.availability_slots for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy bookings_anon_insert on public.bookings for insert to anon, authenticated
  with check (status = 'demande');
create policy bookings_coach_all on public.bookings for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy intake_anon_insert on public.intake_forms for insert to anon, authenticated
  with check (converted_client_id is null and summary is null);
create policy intake_coach_all on public.intake_forms for all to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.coach_id = auth.uid()))
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.coach_id = auth.uid()));

-- Un créneau réservé disparaît des créneaux libres.
create or replace function public.mark_slot_booked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.slot_id is not null then
    update public.availability_slots set is_booked = true where id = new.slot_id and is_booked = false;
    if not found then
      raise exception 'Ce créneau n''est plus disponible.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger bookings_mark_slot before insert on public.bookings
  for each row execute function public.mark_slot_booked();

-- Réservation en une fois pour le prospect (renvoie l'identifiant sans lui ouvrir la lecture de la table).
create or replace function public.book_slot(p_slot_id uuid, p_full_name text, p_phone text, p_email text, p_format text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_slot public.availability_slots; v_id uuid;
begin
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Nom et téléphone obligatoires.' using errcode = 'P0001';
  end if;
  select * into v_slot from public.availability_slots where id = p_slot_id;
  if v_slot.id is null then raise exception 'Créneau introuvable.' using errcode = 'P0001'; end if;
  insert into public.bookings (coach_id, slot_id, full_name, phone, email, starts_at, format, status)
  values (v_slot.coach_id, v_slot.id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), v_slot.starts_at, p_format, 'demande')
  returning id into v_id;
  insert into public.intake_forms (booking_id, status) values (v_id, 'en_attente');
  return v_id;
end $$;

create or replace function public.submit_intake(p_booking_id uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.intake_forms set answers = p_answers, status = 'recu'
  where booking_id = p_booking_id and status = 'en_attente';
  if not found then raise exception 'Questionnaire introuvable ou déjà envoyé.' using errcode = 'P0001'; end if;
  update public.bookings set status = 'confirme' where id = p_booking_id and status = 'demande';
end $$;

grant execute on function public.book_slot(uuid, text, text, text, text), public.submit_intake(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- intégrations
create policy integrations_self on public.integrations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Le coach voit les intégrations de ses coachés, sauf Strava (règles Strava).
create policy integrations_coach_read on public.integrations for select to authenticated
  using (provider <> 'strava'
         and public.is_coach()
         and exists (select 1 from public.profiles p where p.id = user_id and p.coach_id = auth.uid()));
