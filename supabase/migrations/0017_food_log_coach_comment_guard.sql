-- Le commentaire du coach sur une entrée du journal (food_log_entries.coach_comment) n'est écrit que par le coach.
-- La politique food_log_entries_self_write laisse le coaché modifier ses lignes : sans ce garde-fou,
-- il pourrait réécrire ou fabriquer un « commentaire du coach ». À l'insertion, le coaché ne peut pas en poser.
create or replace function public.food_log_guard_coach_comment() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.my_role() = 'coache' then
    if tg_op = 'INSERT' and new.coach_comment is not null then
      raise exception 'Seul le coach peut commenter une entrée du journal.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.coach_comment is distinct from old.coach_comment then
      raise exception 'Seul le coach peut commenter une entrée du journal.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists food_log_guard_coach_comment on public.food_log_entries;
create trigger food_log_guard_coach_comment before insert or update on public.food_log_entries
  for each row execute function public.food_log_guard_coach_comment();
