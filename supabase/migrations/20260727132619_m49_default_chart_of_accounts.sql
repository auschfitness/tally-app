-- m49 — Plano de contas padrao de igreja. Semeado por org (idempotente): novas via trigger,
-- existentes via backfill. Estrutura simples 5 grupos (Ativo/Passivo/Patrimonio/Receitas/Despesas).

create or replace function public.seed_default_chart_of_accounts(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ledger_accounts where org_id = p_org) then return; end if;
  insert into public.ledger_accounts (org_id, code, name, type) values
   (p_org,'1','Ativo','asset'),
   (p_org,'1.1','Caixa e Bancos','asset'),
   (p_org,'1.1.01','Caixa','asset'),
   (p_org,'1.1.02','Banco - Conta Corrente','asset'),
   (p_org,'2','Passivo','liability'),
   (p_org,'2.1','Contas a Pagar','liability'),
   (p_org,'2.1.01','Fornecedores a Pagar','liability'),
   (p_org,'3','Patrimonio','equity'),
   (p_org,'3.1','Patrimonio Social','equity'),
   (p_org,'3.1.01','Saldo Acumulado','equity'),
   (p_org,'4','Receitas','revenue'),
   (p_org,'4.1','Contribuicoes','revenue'),
   (p_org,'4.1.01','Dizimos','revenue'),
   (p_org,'4.1.02','Ofertas','revenue'),
   (p_org,'4.1.03','Doacoes','revenue'),
   (p_org,'4.1.99','Outras Receitas','revenue'),
   (p_org,'5','Despesas','expense'),
   (p_org,'5.1','Despesas Operacionais','expense'),
   (p_org,'5.1.01','Salarios e Encargos','expense'),
   (p_org,'5.1.02','Aluguel','expense'),
   (p_org,'5.1.03','Utilidades (agua/luz/internet)','expense'),
   (p_org,'5.1.04','Missoes','expense'),
   (p_org,'5.1.05','Manutencao','expense'),
   (p_org,'5.1.06','Eventos','expense'),
   (p_org,'5.1.99','Outras Despesas','expense');
  update public.ledger_accounts c
     set parent_id = p.id
    from public.ledger_accounts p
   where c.org_id = p_org and p.org_id = p_org
     and position('.' in c.code) > 0
     and p.code = left(c.code, length(c.code) - position('.' in reverse(c.code)));
end;
$$;

create or replace function public.seed_chart_on_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_default_chart_of_accounts(new.id);
  return new;
end;
$$;
create trigger organizations_seed_chart
after insert on public.organizations
for each row execute function public.seed_chart_on_org();

select public.seed_default_chart_of_accounts(id) from public.organizations;
