-- Test RLS « un coaché ne lit jamais les données d'un autre ».
-- À exécuter tel quel (SQL editor Supabase ou execute_sql) : tout est annulé par le rollback final.
-- Pour chaque coaché de démo, on se met dans sa peau (JWT + rôle authenticated) puis on compte,
-- table par table, les lignes qui ne lui appartiennent pas. Attendu : 0 partout.
-- Sortie : une ligne par fuite détectée, puis une ligne de synthèse « OK » ou « ÉCHEC ».

begin;

create temp table rls_result (coache text, tbl text, foreign_rows int) on commit drop;
grant all on rls_result to authenticated;

do $$
declare
  c record;
  t text;
  n int;
  tables text[] := array['activities','client_meal_plans','client_programs','client_sessions','coach_notes',
    'food_log_entries','invoices','messages','nutrition_goals','session_exercises','session_feedback','sets',
    'shopping_items','subscriptions','supplement_intakes','supplements','weight_logs'];
begin
  for c in
    select p.id as uid, p.full_name, cl.id as client_id
      from public.profiles p join public.clients cl on cl.profile_id = p.id
     where p.role = 'coache'
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', c.uid, 'role', 'authenticated')::text, true);
    set local role authenticated;

    foreach t in array tables loop
      execute format('select count(*) from public.%I where client_id <> $1', t) into n using c.client_id;
      insert into rls_result values (c.full_name, t, n);
    end loop;

    select count(*) into n from public.clients where id <> c.client_id;
    insert into rls_result values (c.full_name, 'clients', n);
    select count(*) into n from public.profiles where role = 'coache' and id <> c.uid;
    insert into rls_result values (c.full_name, 'profiles (autres coachés)', n);
    select count(*) into n from public.bookings;
    insert into rls_result values (c.full_name, 'bookings', n);
    select count(*) into n from public.intake_forms;
    insert into rls_result values (c.full_name, 'intake_forms', n);

    reset role;
  end loop;
end $$;

select coache, tbl, foreign_rows from rls_result where foreign_rows > 0 order by 1, 2;

select case when count(*) filter (where foreign_rows > 0) = 0
            then 'OK : ' || count(distinct coache) || ' coachés × ' || count(distinct tbl) || ' tables, aucune fuite'
            else 'ÉCHEC : ' || count(*) filter (where foreign_rows > 0) || ' fuite(s)' end as verdict
  from rls_result;

rollback;
