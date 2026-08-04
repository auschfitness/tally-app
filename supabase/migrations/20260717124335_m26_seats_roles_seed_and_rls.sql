-- Frente "Tipos de assentos": semear papéis padrão + apertar RLS de roles.

-- 1) RLS de roles: leitura p/ membros; escrita só p/ quem tem members.manage (dono passa via is_owner).
--    Papéis de sistema não podem ser EXCLUÍDOS (só editados/renomeados).
drop policy if exists org_all on public.roles;
create policy roles_select on public.roles
  for select using (public.is_org_member(org_id));
create policy roles_insert on public.roles
  for insert with check (public.has_perm(org_id, 'members.manage'));
create policy roles_update on public.roles
  for update using (public.has_perm(org_id, 'members.manage'))
  with check (public.has_perm(org_id, 'members.manage'));
create policy roles_delete on public.roles
  for delete using (public.has_perm(org_id, 'members.manage') and is_system = false);

-- 2) Função que semeia os 6 cargos padrão (PT-BR). Idempotente: não duplica se a org já tem papéis de sistema.
create or replace function public.seed_default_system_roles(p_org uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Sem permissão para semear papéis nesta organização.';
  end if;
  if exists (select 1 from public.roles r where r.org_id = p_org and r.is_system) then
    return;
  end if;
  insert into public.roles(org_id, name, permissions, is_system) values
    (p_org, 'Dono', array[]::text[], true),
    (p_org, 'Pastor', array['sticks.edit','care.view','care.manage','prayer.view_private','prayer.manage','groups.manage_all','org.manage','members.manage'], true),
    (p_org, 'Tesoureiro', array['finance.manage','members.manage'], true),
    (p_org, 'Equipe de Cuidado', array['sticks.edit','care.view'], true),
    (p_org, 'Líder de Grupo', array['groups.manage_assigned'], true),
    (p_org, 'Membro', array[]::text[], true);
end $$;

-- 3) create_org passa a semear os papéis padrão e a marcar o dono com o cargo "Dono".
create or replace function public.create_org(p_name text, p_currency text, p_campus text, p_state jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_uid uuid; v_journey uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Usuário não autenticado: o token do login não chegou ao banco.';
  end if;
  insert into organizations(name, currency)
    values (coalesce(nullif(p_name,''),'Minha igreja'), coalesce(nullif(p_currency,''),'BRL'))
    returning id into v_org;
  insert into memberships(org_id, user_id, role, is_owner) values (v_org, v_uid, 'owner', true);
  if nullif(p_campus,'') is not null then
    insert into campuses(org_id, name) values (v_org, p_campus);
  end if;
  insert into app_state(org_id, data, updated_by) values (v_org, coalesce(p_state, '{}'::jsonb), v_uid)
    on conflict (org_id) do update set data = excluded.data, updated_at = now();
  insert into journeys(org_id, name, description, is_default)
    values (v_org, 'Jornada padrão', 'Caminho operacional da pessoa pela vida da igreja.', true)
    returning id into v_journey;
  insert into journey_stages(org_id, journey_id, name, position)
    select v_org, v_journey, x.name, x.pos
    from (values
      ('Primeira visita',1),('Retornou',2),('Conectado',3),
      ('Em grupo',4),('Servindo',5),('Liderança',6)
    ) as x(name,pos);
  perform public.seed_default_finance_categories(v_org);
  -- Papéis padrão (assentos) + marca o dono como "Dono"
  perform public.seed_default_system_roles(v_org);
  update memberships
    set role_id = (select id from roles where org_id = v_org and name = 'Dono' and is_system limit 1)
    where org_id = v_org and user_id = v_uid;
  return v_org;
end $function$
