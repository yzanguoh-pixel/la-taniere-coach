-- Un coaché ne peut modifier que le réalisé de ses séries (done, reps, load_kg, rpe),
-- jamais le prescrit (cibles) ni le rattachement.
create or replace function public.sets_guard_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.my_role() = 'coache' and (
       new.target_reps is distinct from old.target_reps
    or new.target_load_kg is distinct from old.target_load_kg
    or new.target_rpe is distinct from old.target_rpe
    or new.set_number is distinct from old.set_number
    or new.session_exercise_id is distinct from old.session_exercise_id
    or new.client_id is distinct from old.client_id) then
    raise exception 'Un coaché peut seulement saisir le réalisé de ses séries.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists sets_guard_update on public.sets;
create trigger sets_guard_update before update on public.sets
  for each row execute function public.sets_guard_update();
