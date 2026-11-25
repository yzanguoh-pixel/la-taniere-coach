-- Un coaché peut seulement marquer comme lus les messages de son fil :
-- toute autre colonne modifiée par un coaché est refusée.
create or replace function public.messages_guard_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.my_role() = 'coache' and (
       new.body is distinct from old.body
    or new.sender is distinct from old.sender
    or new.sender_id is distinct from old.sender_id
    or new.kind is distinct from old.kind
    or new.payload is distinct from old.payload
    or new.client_id is distinct from old.client_id
    or new.created_at is distinct from old.created_at) then
    raise exception 'Un coaché peut seulement marquer un message comme lu.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update before update on public.messages
  for each row execute function public.messages_guard_update();
