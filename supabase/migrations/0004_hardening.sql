-- Durcissement après l'audit de sécurité Supabase (Sprint 0).
-- Les helpers RLS ne servent qu'aux utilisateurs connectés : on retire l'accès anonyme.
revoke execute on function public.is_coach() from public, anon;
revoke execute on function public.my_coach_id() from public, anon;
revoke execute on function public.my_client_id() from public, anon;
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.coach_owns_client(uuid) from public, anon;
revoke execute on function public.can_access_client(uuid) from public, anon;
grant execute on function public.is_coach(), public.my_coach_id(), public.my_client_id(), public.my_role(),
  public.coach_owns_client(uuid), public.can_access_client(uuid) to authenticated;

-- Fonction de déclencheur : jamais appelée directement par l'API.
revoke execute on function public.mark_slot_booked() from public, anon, authenticated;

-- search_path figé.
alter function public.touch_updated_at() set search_path = public;

-- book_slot et submit_intake restent ouverts aux visiteurs (prise de rendez-vous publique) : voulu.
