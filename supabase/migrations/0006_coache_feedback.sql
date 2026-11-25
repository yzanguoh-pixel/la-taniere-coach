-- La Tanière Coach — 0006 : durcissement du retour de séance (agent coaché, Sprint 1)
-- À appliquer par le coordinateur. L'app fonctionne sans (contrôles faits dans la Server Action),
-- mais la base doit refuser seule les cas suivants, constatés en test RLS :
--   1. un coaché pouvait insérer un retour sur la séance d'un AUTRE coaché en mettant son propre client_id ;
--   2. rien n'empêchait deux retours pour la même séance (double clic, deux onglets).

-- 1. Le retour doit viser une séance du coaché connecté (client_id de la séance = client_id du retour).
drop policy if exists session_feedback_self_insert on public.session_feedback;
create policy session_feedback_self_insert on public.session_feedback for insert to authenticated
  with check (
    client_id = public.my_client_id()
    and exists (
      select 1 from public.client_sessions cs
      where cs.id = client_session_id and cs.client_id = public.my_client_id()
    )
  );

-- 2. Un seul retour par séance (la Server Action affiche « Retour déjà envoyé. »).
create unique index if not exists session_feedback_one_per_session on public.session_feedback (client_session_id);
