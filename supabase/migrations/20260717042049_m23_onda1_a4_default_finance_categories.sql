-- Onda 1 / A4: função reutilizável p/ semear categorias financeiras padrão (PT-BR).
-- Idempotente por nome+tipo; serve tanto no create_org quanto num botão "usar padrão".
create or replace function public.seed_default_finance_categories(p_org uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
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
