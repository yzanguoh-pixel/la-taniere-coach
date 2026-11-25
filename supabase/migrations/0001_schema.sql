-- La Tanière Coach — 0001 : schéma de données
-- Modèle issu de CLAUDE.md. Toutes les tables vivent dans le schéma public ;
-- la sécurité (RLS) est posée dans 0002_rls.sql.

-- gen_random_uuid() est natif depuis Postgres 13 : aucune extension requise.

-- Mise à jour automatique de updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- comptes
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('coach', 'coache')),
  full_name   text not null,
  initials    text not null,
  email       text,
  coach_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint coache_has_coach check (role = 'coach' or coach_id is not null)
);
create index profiles_coach_id_idx on public.profiles (coach_id);

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null unique references public.profiles (id) on delete cascade,
  coach_id           uuid not null references public.profiles (id) on delete cascade,
  goal               text,
  level              text check (level in ('debutant', 'intermediaire', 'confirme')),
  sessions_per_week  smallint check (sessions_per_week between 0 and 14),
  injuries           text,
  weight_kg          numeric(5, 1),
  height_cm          smallint,
  food_exclusions    text[] not null default '{}',
  targets            jsonb not null default '{}'::jsonb,   -- ex. {"squat_kg": 70}
  preferred_channel  text not null default 'app' check (preferred_channel in ('app', 'whatsapp')),
  status             text not null default 'actif' check (status in ('actif', 'archive')),
  since              date not null default current_date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index clients_coach_id_idx on public.clients (coach_id);

-- Notes privées du coach : table séparée, jamais lisible par le coaché.
create table public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index coach_notes_client_idx on public.coach_notes (client_id);

-- ---------------------------------------------------------------- prospects
create table public.availability_slots (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  format      text not null default 'visio' check (format in ('visio', 'salle', 'les_deux')),
  is_booked   boolean not null default false,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index availability_slots_starts_idx on public.availability_slots (coach_id, starts_at);

create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  slot_id     uuid references public.availability_slots (id) on delete set null,
  full_name   text not null,
  phone       text not null,
  email       text,
  starts_at   timestamptz,
  format      text not null check (format in ('visio', 'salle')),
  status      text not null default 'demande' check (status in ('demande', 'confirme', 'realise', 'annule', 'converti')),
  created_at  timestamptz not null default now()
);
create index bookings_coach_idx on public.bookings (coach_id, starts_at);

create table public.intake_forms (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete cascade,
  status               text not null default 'en_attente' check (status in ('en_attente', 'recu')),
  answers              jsonb,
  tests                jsonb,
  summary              jsonb,
  converted_client_id  uuid references public.clients (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index intake_forms_booking_idx on public.intake_forms (booking_id);

-- ---------------------------------------------------------------- programmes
create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  name_fr     text not null unique,
  aliases     text[] not null default '{}',
  category    text not null,
  muscles     text[] not null default '{}',
  equipment   text,
  created_at  timestamptz not null default now()
);
create index exercises_category_idx on public.exercises (category);

create table public.program_templates (
  id                 uuid primary key default gen_random_uuid(),
  coach_id           uuid not null references public.profiles (id) on delete cascade,
  name               text not null,
  goal               text not null,
  level              text check (level in ('debutant', 'intermediaire', 'confirme')),
  weeks              smallint not null default 8,
  sessions_per_week  smallint not null default 3,
  description        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.template_sessions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.program_templates (id) on delete cascade,
  label        text not null,               -- A, B, C
  name         text not null,
  position     smallint not null default 0
);
create index template_sessions_tpl_idx on public.template_sessions (template_id);

create table public.template_exercises (
  id                   uuid primary key default gen_random_uuid(),
  template_session_id  uuid not null references public.template_sessions (id) on delete cascade,
  exercise_id          uuid not null references public.exercises (id),
  position             smallint not null default 0,
  sets                 smallint not null default 3,
  reps                 text not null default '10',
  load_kg              numeric(6, 2),
  target_rpe           numeric(3, 1),
  rest_s               smallint,
  consigne             text
);
create index template_exercises_session_idx on public.template_exercises (template_session_id);

-- Copie personnalisée d'un modèle pour un coaché (jamais le modèle lui-même).
create table public.client_programs (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  template_id  uuid references public.program_templates (id) on delete set null,
  name         text not null,
  adaptations  jsonb not null default '[]'::jsonb,   -- ["Charges calées sur son bilan", ...]
  start_date   date not null default current_date,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index client_programs_client_idx on public.client_programs (client_id);

create table public.client_sessions (
  id                 uuid primary key default gen_random_uuid(),
  client_program_id  uuid not null references public.client_programs (id) on delete cascade,
  client_id          uuid not null references public.clients (id) on delete cascade,
  label              text not null,
  name               text not null,
  week               smallint not null default 1,
  date               date not null,
  status             text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  done_at            timestamptz,
  created_at         timestamptz not null default now()
);
create index client_sessions_client_date_idx on public.client_sessions (client_id, date);

create table public.session_exercises (
  id                 uuid primary key default gen_random_uuid(),
  client_session_id  uuid not null references public.client_sessions (id) on delete cascade,
  client_id          uuid not null references public.clients (id) on delete cascade,
  exercise_id        uuid not null references public.exercises (id),
  position           smallint not null default 0,
  consigne           text,
  rest_s             smallint
);
create index session_exercises_session_idx on public.session_exercises (client_session_id);

create table public.sets (
  id                   uuid primary key default gen_random_uuid(),
  session_exercise_id  uuid not null references public.session_exercises (id) on delete cascade,
  client_id            uuid not null references public.clients (id) on delete cascade,
  set_number           smallint not null,
  target_reps          smallint,
  target_load_kg       numeric(6, 2),
  target_rpe           numeric(3, 1),
  reps                 smallint,
  load_kg              numeric(6, 2),
  rpe                  numeric(3, 1),
  done                 boolean not null default false
);
create index sets_exercise_idx on public.sets (session_exercise_id);

create table public.session_feedback (
  id                 uuid primary key default gen_random_uuid(),
  client_session_id  uuid not null references public.client_sessions (id) on delete cascade,
  client_id          uuid not null references public.clients (id) on delete cascade,
  rpe                smallint not null check (rpe between 1 and 10),
  feeling            text not null check (feeling in ('facile', 'correct', 'difficile', 'douleur')),
  pain_zone          text,
  note               text,
  created_at         timestamptz not null default now(),
  handled_at         timestamptz,
  check (feeling <> 'douleur' or pain_zone is not null)
);
create index session_feedback_client_idx on public.session_feedback (client_id, created_at desc);
create index session_feedback_open_idx on public.session_feedback (handled_at) where handled_at is null;

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  sender      text not null check (sender in ('coach', 'coache', 'systeme')),
  sender_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  kind        text not null default 'text' check (kind in ('text', 'event')),
  payload     jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index messages_client_idx on public.messages (client_id, created_at);

-- ---------------------------------------------------------------- nutrition
create table public.foods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text,
  category    text,
  source      text not null default 'coach' check (source in ('ciqual', 'openfoodfacts', 'coach')),
  kcal        numeric(6, 1) not null,   -- pour 100 g
  protein_g   numeric(5, 1) not null,
  carbs_g     numeric(5, 1) not null,
  fat_g       numeric(5, 1) not null,
  created_at  timestamptz not null default now(),
  unique (name, brand)
);
create index foods_name_idx on public.foods (lower(name));

create table public.nutrition_goals (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  day_type    text not null check (day_type in ('training', 'rest')),
  kcal        integer not null,
  protein_g   integer not null,
  carbs_g     integer not null,
  fat_g       integer not null,
  updated_at  timestamptz not null default now(),
  unique (client_id, day_type)
);

create table public.recipes (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references public.profiles (id) on delete cascade,
  name              text not null,
  servings          smallint not null default 1,
  kcal_per_serving  integer not null,
  protein_g         numeric(5, 1) not null,
  carbs_g           numeric(5, 1) not null,
  fat_g             numeric(5, 1) not null,
  ingredients       jsonb not null default '[]'::jsonb,
  steps             text,
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now()
);

create table public.meal_plan_templates (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  goal         text not null,
  kcal_target  integer not null,
  description  text,
  meals        jsonb not null default '[]'::jsonb,   -- [{meal, items:[...]}]
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.client_meal_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  template_id  uuid references public.meal_plan_templates (id) on delete set null,
  name         text not null,
  adaptations  jsonb not null default '[]'::jsonb,
  kcal_target  integer not null,
  meals        jsonb not null default '[]'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index client_meal_plans_client_idx on public.client_meal_plans (client_id);

create table public.food_log_entries (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  date           date not null,
  meal           text not null check (meal in ('petit_dejeuner', 'dejeuner', 'collation', 'diner')),
  food_id        uuid references public.foods (id) on delete set null,
  recipe_id      uuid references public.recipes (id) on delete set null,
  label          text,
  quantity       numeric(7, 1) not null,   -- grammes, ou portions si recette
  kcal           numeric(7, 1) not null,
  protein_g      numeric(6, 1) not null default 0,
  carbs_g        numeric(6, 1) not null default 0,
  fat_g          numeric(6, 1) not null default 0,
  coach_comment  text,
  created_at     timestamptz not null default now(),
  check (food_id is not null or recipe_id is not null or label is not null)
);
create index food_log_client_date_idx on public.food_log_entries (client_id, date);

create table public.supplements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  dose        text,
  timing      text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.supplement_intakes (
  id             uuid primary key default gen_random_uuid(),
  supplement_id  uuid not null references public.supplements (id) on delete cascade,
  client_id      uuid not null references public.clients (id) on delete cascade,
  date           date not null,
  unique (supplement_id, date)
);

create table public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  quantity    text,
  checked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index shopping_items_client_idx on public.shopping_items (client_id);

-- ---------------------------------------------------------------- objets connectés (simulés)
create table public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  date        date not null,
  weight_kg   numeric(5, 1) not null,
  source      text not null default 'manuel',
  created_at  timestamptz not null default now()
);
create index weight_logs_client_idx on public.weight_logs (client_id, date);

create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  date          date not null,
  type          text not null,
  duration_min  integer,
  distance_km   numeric(6, 2),
  kcal          integer,
  source        text not null default 'manuel',
  created_at    timestamptz not null default now()
);
create index activities_client_idx on public.activities (client_id, date);

create table public.integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  provider       text not null,   -- google_agenda, outlook, ics, withings, garmin, whoop, apple_sante, health_connect, strava, paiement, notifications
  status         text not null default 'disconnected' check (status in ('connected', 'disconnected')),
  connected_at   timestamptz,
  last_sync_at   timestamptz,
  shared_scopes  jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, provider)
);

-- ---------------------------------------------------------------- abonnements
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  plan_name   text not null,
  price_eur   numeric(8, 2),   -- null tant que les tarifs ne sont pas fixés : l'app affiche [PRIX]
  period      text not null default 'mensuel' check (period in ('mensuel', 'trimestriel', 'annuel')),
  starts_on   date not null,
  renews_on   date not null,
  status      text not null default 'actif' check (status in ('actif', 'a_renouveler', 'en_retard', 'resilie')),
  created_at  timestamptz not null default now()
);
create index subscriptions_renews_idx on public.subscriptions (renews_on);

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete cascade,
  number           text not null unique,
  amount_eur       numeric(8, 2),
  issued_on        date not null,
  status           text not null default 'payee' check (status in ('payee', 'en_attente')),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- configuration
create table public.app_config (
  key    text primary key,
  value  text not null
);

-- Déclencheurs updated_at
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger intake_forms_touch before update on public.intake_forms for each row execute function public.touch_updated_at();
create trigger program_templates_touch before update on public.program_templates for each row execute function public.touch_updated_at();
create trigger client_programs_touch before update on public.client_programs for each row execute function public.touch_updated_at();
create trigger meal_plan_templates_touch before update on public.meal_plan_templates for each row execute function public.touch_updated_at();
create trigger client_meal_plans_touch before update on public.client_meal_plans for each row execute function public.touch_updated_at();
create trigger nutrition_goals_touch before update on public.nutrition_goals for each row execute function public.touch_updated_at();
