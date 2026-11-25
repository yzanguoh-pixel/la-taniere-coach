-- La Tanière Coach — seed local (exécuté par `supabase db reset`).
-- Les fonctions seed_demo() / reset_demo() sont dans migrations/0003_demo_seed.sql.
-- Les comptes auth doivent exister (scripts/create-demo-users.ts) : sinon on ne fait rien.
do $$
begin
  if exists (select 1 from auth.users where raw_user_meta_data->>'demo_key' = 'karim') then
    perform public.seed_demo();
  else
    raise notice 'Comptes de démo absents : lancez npx tsx --env-file=.env.local scripts/create-demo-users.ts';
  end if;
end $$;
