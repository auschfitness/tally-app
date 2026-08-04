-- Endurecimento pós-advisors da Onda 1.

-- 1) search_path fixo no trigger de updated_at (advisor 0011).
create or replace function public.fiscal_set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 2) Guarda na função de seed: só dono/gestor da PRÓPRIA org pode semear
--    (bloqueia chamada RPC direta contra org alheia, já que é SECURITY DEFINER).
create or replace function public.seed_default_finance_categories(p_org uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.can_manage_org_fiscal(p_org) then
    raise exception 'Sem permissão para semear categorias nesta organização.';
  end if;
  insert into public.finance_categories(org_id, type, name)
  select p_org, d.type::entry_type, d.name
  from (values
    ('in','Dízimos'),
    ('in','Ofertas'),
    ('in','Doações especiais'),
    ('in','Eventos'),
    ('in','Missões'),
    ('out','Aluguel'),
    ('out','Salários'),
    ('out','Equipamentos'),
    ('out','Marketing'),
    ('out','Ministério infantil'),
    ('out','Missões'),
    ('out','Manutenção')
  ) as d(type, name)
  where not exists (
    select 1 from public.finance_categories fc
    where fc.org_id = p_org and fc.type = d.type::entry_type and fc.name = d.name
  );
end $$;
