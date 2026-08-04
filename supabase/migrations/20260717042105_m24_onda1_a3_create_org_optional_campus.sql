-- Onda 1 / A3: campus deixa de ser obrigatório no cadastro (gerido depois em Configurações).
-- Além disso, semeia categorias financeiras padrão. Restante idêntico ao original.
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
  -- Campus opcional: só cria se um nome foi informado (Onda 1 #2 tira campus do cadastro).
  if nullif(p_campus,'') is not null then
    insert into campuses(org_id, name) values (v_org, p_campus);
  end if;
  insert into app_state(org_id, data, updated_by) values (v_org, coalesce(p_state, '{}'::jsonb), v_uid)
    on conflict (org_id) do update set data = excluded.data, updated_at = now();
  -- journey padrão + estágios
  insert into journeys(org_id, name, description, is_default)
    values (v_org, 'Jornada padrão', 'Caminho operacional da pessoa pela vida da igreja.', true)
    returning id into v_journey;
  insert into journey_stages(org_id, journey_id, name, position)
    select v_org, v_journey, x.name, x.pos
    from (values
      ('Primeira visita',1),('Retornou',2),('Conectado',3),
      ('Em grupo',4),('Servindo',5),('Liderança',6)
    ) as x(name,pos);
  -- Categorias financeiras padrão (Onda 1 #5)
  perform public.seed_default_finance_categories(v_org);
  return v_org;
end $function$
