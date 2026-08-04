-- País passa a viver na organização (escolhido no cadastro) e dita o formulário fiscal.
-- Decisão do dono: uma igreja = um local; país único por igreja.
alter table public.organizations
  add column if not exists country text not null default 'BR' check (country in ('BR','US'));

-- create_org aceita país (opcional c/ default p/ não quebrar chamadas antigas de 4 args).
create or replace function public.create_org(
  p_name text, p_currency text, p_campus text, p_state jsonb, p_country text default 'BR'
)
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
  insert into organizations(name, currency, country)
    values (
      coalesce(nullif(p_name,''),'Minha igreja'),
      coalesce(nullif(p_currency,''),'BRL'),
      case when p_country in ('BR','US') then p_country else 'BR' end
    )
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
  perform public.seed_default_system_roles(v_org);
  update memberships
    set role_id = (select id from roles where org_id = v_org and name = 'Dono' and is_system limit 1)
    where org_id = v_org and user_id = v_uid;
  return v_org;
end $function$
