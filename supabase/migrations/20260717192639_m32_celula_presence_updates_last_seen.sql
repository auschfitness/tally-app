-- Roadmap #4: presença de CÉLULA (group) é a que conta para a pessoa; culto NÃO.
-- Trigger: ao marcar presença em sessão de célula, atualiza sticks.last_seen_at.
-- (Fecha a lacuna herdada: check-in não atualizava last_seen.) Só 'group', nunca 'service'.
create or replace function public.touch_stick_last_seen()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_ctx text; v_date date; v_org uuid;
begin
  if new.status is distinct from 'present' then
    return new;
  end if;
  select s.context_type::text, s.session_date, s.org_id
    into v_ctx, v_date, v_org
    from public.attendance_sessions s
    where s.id = new.session_id;
  if v_ctx = 'group' and v_date is not null then
    update public.sticks
      set last_seen_at = v_date, updated_at = now()
      where id = new.stick_id
        and org_id = v_org
        and (last_seen_at is null or last_seen_at < v_date);
  end if;
  return new;
end $$;

drop trigger if exists trg_touch_stick_last_seen on public.attendance_records;
create trigger trg_touch_stick_last_seen
  after insert or update on public.attendance_records
  for each row execute function public.touch_stick_last_seen();
