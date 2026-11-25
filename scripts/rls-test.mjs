/**
 * Test des migrations, du seed et des règles RLS de La Tanière Coach, sans Supabase.
 *
 * Il rejoue supabase/migrations/*.sql dans PGlite (Postgres en WebAssembly) avec un faux schéma
 * « auth » qui imite Supabase : table auth.users, fonction auth.uid() lisant request.jwt.claim.sub,
 * rôles anon / authenticated / service_role et droits par défaut accordés par Supabase.
 *
 *   npm i -D @electric-sql/pglite
 *   node scripts/rls-test.mjs
 *   (ou PGLITE_MODULE=/chemin/vers/@electric-sql/pglite/dist/index.js node scripts/rls-test.mjs)
 *
 * Limites : PGlite n'est pas Supabase (pas de PostgREST, pas de GoTrue, pas de JWT réel).
 * Le test vérifie la logique SQL et la RLS ; la connexion réelle se vérifie sur le projet Supabase.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();

let failed = 0;
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'ÉCHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failed++;
};

// ---------------------------------------------------------------- faux Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  -- Droits par défaut de Supabase : tables et fonctions du schéma public accordées à anon/authenticated,
  -- c'est la RLS (et les revoke des migrations) qui protègent.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);

const migDir = join(root, 'supabase', 'migrations');
for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(migDir, f), 'utf8'));
  console.log(`Migration appliquée : ${f}`);
}

// Comptes simulés (équivalent de scripts/create-demo-users.ts)
const keys = ['karim', 'lea', 'tom', 'yanis', 'ines', 'hugo', 'camille', 'sarah', 'malik', 'julie', 'theo'];
for (const k of keys) {
  await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('demo_key', $2::text))`, [`${k}@demo.la-taniere.fr`, k]);
}
const id = {};
for (const r of (await db.query(`select id, raw_user_meta_data->>'demo_key' k from auth.users`)).rows) id[r.k] = r.id;

await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'));
console.log('Seed appliqué (seed.sql → seed_demo()).\n');

// Exécute une requête sous un rôle donné, comme PostgREST le ferait avec le JWT de l'utilisateur.
async function as(user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${user === 'anon' ? 'anon' : 'authenticated'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user === 'anon' ? '' : id[user]]);
    return tx.query(sql, params);
  });
}
async function fails(user, sql, params = []) {
  try { await as(user, sql, params); return null; } catch (e) { return e.message; }
}
const n = async (user, sql, params) => Number((await as(user, sql, params)).rows[0].n);

// ---------------------------------------------------------------- données de démo
ok(Number((await db.query(`select count(*) n from public.clients`)).rows[0].n) === 10, 'Seed : 10 coachés');
ok(Number((await db.query(`select count(*) n from public.program_templates`)).rows[0].n) === 7, 'Seed : 7 modèles de programme');
ok(Number((await db.query(`select count(*) n from public.meal_plan_templates`)).rows[0].n) === 6, 'Seed : 6 plans alimentaires');
const ex = Number((await db.query(`select count(*) n from public.exercises`)).rows[0].n);
const fo = Number((await db.query(`select count(*) n from public.foods`)).rows[0].n);
ok(ex >= 80 && fo >= 200, 'Seed : catalogues', `${ex} exercices, ${fo} aliments`);
ok(Number((await db.query(`select count(*) n from public.bookings`)).rows[0].n) === 3, 'Seed : 3 prospects (Nora, Emma, Lucas)');
const leaClient = (await db.query(`select id from public.clients where profile_id = $1`, [id.lea])).rows[0].id;
const tomClient = (await db.query(`select id from public.clients where profile_id = $1`, [id.tom])).rows[0].id;
const fb = (await db.query(`select rpe, feeling, note from public.session_feedback where client_id = $1`, [leaClient])).rows[0];
ok(fb && fb.rpe === 6 && fb.note.startsWith('Squat facile'), 'Léa : retour « Squat facile… » RPE 6');
const kcal = Number((await db.query(`select sum(kcal) n from public.food_log_entries where client_id = $1 and date = date_trunc('week', current_date)::date`, [leaClient])).rows[0].n);
ok(Math.abs(kcal - 1276) < 0.5, 'Léa : journal du lundi à 1 276 kcal', `${kcal} kcal`);
const goal = Number((await db.query(`select kcal n from public.nutrition_goals where client_id = $1 and day_type = 'training'`, [leaClient])).rows[0].n);
ok(goal === 2100, 'Léa : objectif 2 100 kcal les jours d’entraînement');
const squat = (await db.query(`select max(s.target_load_kg) filter (where cs.status = 'planned') planned, max(s.load_kg) filter (where cs.status = 'done') done
  from public.sets s join public.session_exercises se on se.id = s.session_exercise_id join public.client_sessions cs on cs.id = se.client_session_id
  join public.exercises e on e.id = se.exercise_id where se.client_id = $1 and e.name_fr = 'Squat barre'`, [leaClient])).rows[0];
ok(Number(squat.planned) === 60 && Number(squat.done) === 60, 'Léa : squat à 60 kg (fait et prévu)');
const fentes = Number((await db.query(`select count(*) n from public.session_exercises se join public.exercises e on e.id = se.exercise_id where se.client_id = $1 and e.name_fr = 'Fentes avant'`, [leaClient])).rows[0].n);
ok(fentes === 0, 'Léa : fentes remplacées par step-up (copie personnalisée)');
const tplFentes = Number((await db.query(`select count(*) n from public.template_exercises te join public.exercises e on e.id = te.exercise_id join public.template_sessions ts on ts.id = te.template_session_id join public.program_templates t on t.id = ts.template_id where t.name = 'Force bas du corps' and e.name_fr = 'Fentes avant'`)).rows[0].n);
ok(tplFentes === 1, 'Le modèle « Force bas du corps » garde ses fentes (jamais modifié)');

// ---------------------------------------------------------------- RLS coaché
ok(await n('lea', `select count(*) n from public.clients`) === 1, 'Léa ne voit qu’une fiche client : la sienne');
ok(await n('lea', `select count(*) n from public.clients where id = $1`, [tomClient]) === 0, 'Léa ne voit pas la fiche de Tom');
ok(await n('lea', `select count(*) n from public.session_feedback where client_id = $1`, [tomClient]) === 0, 'Léa ne voit pas les retours de Tom');
ok(await n('lea', `select count(*) n from public.messages where client_id <> $1`, [leaClient]) === 0, 'Léa ne voit aucun message d’un autre coaché');
ok(await n('lea', `select count(*) n from public.coach_notes`) === 0, 'Léa ne voit pas les notes privées du coach');
ok(await n('lea', `select count(*) n from public.profiles`) === 2, 'Léa voit son profil et celui de Karim, pas les autres');
ok(await n('lea', `select count(*) n from public.exercises`) >= 80, 'Léa lit le catalogue d’exercices');
ok(await n('lea', `select count(*) n from public.integrations where provider = 'strava'`) === 1, 'Léa voit sa propre connexion Strava');
const upd = await as('lea', `update public.sets set done = true where client_id = $1 returning id`, [tomClient]);
ok(upd.rows.length === 0, 'Léa ne peut pas modifier les séries de Tom');
const sessTom = (await db.query(`select id from public.client_sessions where client_id = $1 limit 1`, [tomClient])).rows[0].id;
ok((await fails('lea', `insert into public.session_feedback (client_session_id, client_id, rpe, feeling, note) values ($1, $2, 5, 'correct', 'x')`, [sessTom, tomClient])) !== null,
  'Léa ne peut pas envoyer un retour au nom de Tom');
const sessLea = (await db.query(`select id from public.client_sessions where client_id = $1 and status = 'planned' order by date limit 1`, [leaClient])).rows[0].id;
ok((await fails('lea', `insert into public.session_feedback (client_session_id, client_id, rpe, feeling, note) values ($1, $2, 7, 'correct', 'Séance B ok')`, [sessLea, leaClient])) === null,
  'Léa peut envoyer son propre retour de séance');
ok((await fails('lea', `insert into public.messages (client_id, sender, sender_id, body) values ($1, 'coach', $2, 'faux')`, [leaClient, id.lea])) !== null,
  'Léa ne peut pas écrire un message au nom du coach');
ok((await fails('lea', `update public.profiles set full_name = 'Léa M.' where id = $1`, [id.lea])) === null, 'Léa peut modifier son propre profil (pas de récursion RLS)');
ok((await fails('lea', `update public.profiles set role = 'coach' where id = $1`, [id.lea])) !== null, 'Léa ne peut pas se donner le rôle coach');
ok((await fails('lea', `select public._demo_copy_program($1, 'Hyrox', '[]'::jsonb, 1, 1)`, [leaClient])) !== null, 'Fonction interne de seed non exécutable par un utilisateur');
ok((await fails('lea', `update public.clients set coach_id = $1 where id = $2`, [id.lea, leaClient])) !== null
  || (await n('lea', `select count(*) n from public.clients where coach_id = $1`, [id.lea])) === 0, 'Léa ne peut pas modifier sa fiche client');

// ---------------------------------------------------------------- RLS coach
ok(await n('karim', `select count(*) n from public.clients`) === 10, 'Karim voit ses 10 coachés');
ok(await n('karim', `select count(*) n from public.coach_notes`) === 1, 'Karim voit ses notes privées');
ok(await n('karim', `select count(*) n from public.integrations where provider = 'strava'`) === 0, 'Strava n’est jamais visible par le coach');
ok(await n('karim', `select count(*) n from public.integrations where user_id <> $1`, [id.karim]) > 0, 'Karim voit les autres intégrations de ses coachés');
ok(await n('karim', `select count(*) n from public.session_feedback where handled_at is null`) >= 5, 'Karim voit les retours à traiter');
ok(await n('karim', `select count(*) n from public.bookings`) === 3, 'Karim voit les 3 demandes de bilan');

// ---------------------------------------------------------------- parcours prospect (anon)
const freeBefore = await n('anon', `select count(*) n from public.availability_slots`);
ok(freeBefore > 0, 'Anon voit les créneaux libres', `${freeBefore} créneaux`);
const slot = (await as('anon', `select id from public.availability_slots order by starts_at limit 1`)).rows[0].id;
const booked = await as('anon', `select public.book_slot($1, 'Test Prospect', '0600000000', 'test@exemple.fr', 'visio') as id`, [slot]);
ok(!!booked.rows[0].id, 'Anon réserve un créneau (book_slot)');
ok((await fails('anon', `select public.submit_intake($1, '{"objectif":"test"}'::jsonb)`, [booked.rows[0].id])) === null, 'Anon envoie son questionnaire (submit_intake)');
ok(await n('anon', `select count(*) n from public.availability_slots where id = $1`, [slot]) === 0, 'Le créneau réservé disparaît des créneaux libres');
ok((await fails('anon', `select public.book_slot($1, 'Deuxième', '0600000001', null, 'visio')`, [slot])) !== null, 'Un créneau ne peut pas être réservé deux fois');
ok((await fails('anon', `insert into public.bookings (coach_id, full_name, phone, format, status) values ($1, 'Direct', '06', 'salle', 'demande')`, [id.karim])) === null,
  'Anon peut insérer directement une réservation');
ok(await n('anon', `select count(*) n from public.clients`) === 0, 'Anon ne lit aucune fiche client');
ok(await n('anon', `select count(*) n from public.bookings`) === 0, 'Anon ne relit pas les réservations');
ok(await n('anon', `select count(*) n from public.intake_forms`) === 0, 'Anon ne lit pas les questionnaires');
ok(await n('karim', `select count(*) n from public.intake_forms where status = 'recu'`) === 3, 'Karim reçoit le questionnaire du nouveau prospect');

// ---------------------------------------------------------------- reset_demo()
ok((await fails('lea', `select public.reset_demo()`)) !== null, 'reset_demo() refusé pour un coaché');
ok((await fails('anon', `select public.reset_demo()`)) !== null, 'reset_demo() refusé pour un visiteur');
ok((await fails('lea', `select public.seed_demo()`)) !== null, 'seed_demo() non exécutable par un utilisateur');
await as('karim', `insert into public.messages (client_id, sender, sender_id, body) values ($1, 'coach', $2, 'Message de test')`, [leaClient, id.karim]);
ok((await fails('karim', `select public.reset_demo()`)) === null, 'reset_demo() accepté pour le coach');
ok(Number((await db.query(`select count(*) n from public.messages where body = 'Message de test'`)).rows[0].n) === 0, 'Après reset_demo(), les modifications de démo sont effacées');
ok(Number((await db.query(`select count(*) n from public.bookings`)).rows[0].n) === 3, 'Après reset_demo(), les 3 prospects sont revenus');
ok(Number((await db.query(`select count(*) n from auth.users`)).rows[0].n) === 11, 'reset_demo() ne touche pas aux comptes auth');
ok(await n('lea', `select count(*) n from public.clients`) === 1, 'Après reset, Léa retrouve sa fiche (profils recréés sur les mêmes comptes)');

console.log(`\n${failed === 0 ? 'Tous les tests passent.' : failed + ' test(s) en échec.'}`);
process.exit(failed === 0 ? 0 : 1);
