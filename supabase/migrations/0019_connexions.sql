-- La Tanière Coach — 0019 : connexions simulées (US35)
-- Constat (vérifié par execute_sql, transaction annulée) : la policy générique
-- activities_coach_all (0002) laisse le coach lire TOUTES les activités de ses coachés,
-- y compris celles importées de Strava (source = 'strava'). Les règles Strava interdisent
-- de les montrer à un tiers : on remplace cette policy par des policies coach qui excluent
-- toujours source = 'strava' (lecture ET écriture).
--
-- Rien d'autre n'est nécessaire : le coaché peut déjà insérer/supprimer ses propres pesées
-- et activités (policies *_self_write) et gérer ses lignes d'intégrations (integrations_self) ;
-- le coach lit déjà les intégrations de ses coachés sauf Strava (integrations_coach_read).

drop policy if exists activities_coach_all on public.activities;

create policy activities_coach_select on public.activities for select to authenticated
  using (public.coach_owns_client(client_id) and source <> 'strava');
create policy activities_coach_insert on public.activities for insert to authenticated
  with check (public.coach_owns_client(client_id) and source <> 'strava');
create policy activities_coach_update on public.activities for update to authenticated
  using (public.coach_owns_client(client_id) and source <> 'strava')
  with check (public.coach_owns_client(client_id) and source <> 'strava');
create policy activities_coach_delete on public.activities for delete to authenticated
  using (public.coach_owns_client(client_id) and source <> 'strava');
