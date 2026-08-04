
create or replace function public.create_org(p_name text, p_currency text, p_campus text, p_state jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid; v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Usuário não autenticado: o token do login não chegou ao banco.';
  end if;
  insert into organizations(name, currency) values (coalesce(nullif(p_name,''),'Minha igreja'), coalesce(nullif(p_currency,''),'BRL')) returning id into v_org;
  insert into memberships(org_id, user_id, role, is_owner) values (v_org, v_uid, 'owner', true);
  insert into campuses(org_id, name) values (v_org, coalesce(nullif(p_campus,''),'Sede'));
  insert into app_state(org_id, data, updated_by) values (v_org, coalesce(p_state, '{}'::jsonb), v_uid)
    on conflict (org_id) do update set data = excluded.data, updated_at = now();
  return v_org;
end $$;

revoke execute on function public.create_org(text,text,text,jsonb) from public;
revoke execute on function public.create_org(text,text,text,jsonb) from anon;
grant execute on function public.create_org(text,text,text,jsonb) to authenticated;
