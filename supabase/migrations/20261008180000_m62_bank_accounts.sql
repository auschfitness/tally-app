-- m62 — Contas bancárias (spec 11, fase A). Conta bancária continua sendo conta do plano
-- (asset sob 1.1); ganha o banco (COMPE), a marca de conta padrão (uma por igreja) e o
-- saldo inicial (lançamento postado contra 3.1.01 Saldo Acumulado, reference 'saldo_inicial').
-- Reverter: drop function set_opening_balance, set_default_account; drop index
-- ledger_accounts_one_default; alter table ledger_accounts drop column is_default, bank_code.

alter table public.ledger_accounts add column if not exists bank_code text;
alter table public.ledger_accounts add column if not exists is_default boolean not null default false;
create unique index if not exists ledger_accounts_one_default on public.ledger_accounts(org_id) where is_default;

create or replace function public.set_default_account(p_org uuid, p_account uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_perm(p_org, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_account is not null and not exists (
    select 1 from ledger_accounts where id = p_account and org_id = p_org and type = 'asset' and is_active
  ) then
    raise exception 'conta inexistente' using errcode = '22023';
  end if;
  update ledger_accounts set is_default = false where org_id = p_org and is_default;
  if p_account is not null then
    update ledger_accounts set is_default = true where id = p_account;
  end if;
end;
$$;

-- Saldo inicial: anula o anterior desta conta (se houver) e lança o novo. Valor negativo =
-- conta começou devendo (cheque especial). Zero só anula.
create or replace function public.set_opening_balance(p_org uuid, p_account uuid, p_amount numeric, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_equity uuid;
  v_entry uuid;
begin
  if not has_perm(p_org, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from ledger_accounts where id = p_account and org_id = p_org and type = 'asset') then
    raise exception 'conta inexistente' using errcode = '22023';
  end if;
  select id into v_equity from ledger_accounts where org_id = p_org and code = '3.1.01';
  if v_equity is null then
    select a.id into v_equity from ledger_accounts a
     where a.org_id = p_org and a.type = 'equity' and a.is_active
       and not exists (select 1 from ledger_accounts c where c.parent_id = a.id)
     order by a.code limit 1;
  end if;
  if v_equity is null then raise exception 'plano sem conta de patrimonio' using errcode = '22023'; end if;

  update journal_entries e set status = 'void'
   where e.org_id = p_org and e.status = 'posted' and e.reference = 'saldo_inicial'
     and exists (select 1 from journal_lines l where l.entry_id = e.id and l.account_id = p_account);

  if v_amount = 0 then return; end if;

  insert into journal_entries (org_id, entry_date, memo, reference, created_by)
  values (p_org, coalesce(p_date, current_date), 'Saldo inicial', 'saldo_inicial', auth.uid())
  returning id into v_entry;
  insert into journal_lines (org_id, entry_id, account_id, debit, credit, line_no) values
    (p_org, v_entry, case when v_amount > 0 then p_account else v_equity end, abs(v_amount), 0, 1),
    (p_org, v_entry, case when v_amount > 0 then v_equity else p_account end, 0, abs(v_amount), 2);
  perform post_journal_entry(v_entry);
end;
$$;

revoke execute on function public.set_default_account(uuid, uuid) from public, anon;
revoke execute on function public.set_opening_balance(uuid, uuid, numeric, date) from public, anon;
grant execute on function public.set_default_account(uuid, uuid) to authenticated;
grant execute on function public.set_opening_balance(uuid, uuid, numeric, date) to authenticated;

-- Correção do balancete (m48): o left join nas partidas somava linhas de lançamentos
-- anulados e rascunhos (o filtro de status estava só no join do cabeçalho). Agora só entram
-- partidas de lançamentos postados até a data de corte.
create or replace function public.trial_balance(p_org uuid, p_as_of date default null)
returns table (account_id uuid, code text, name text, type ledger_account_type,
               debit numeric, credit numeric, balance numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_perm(p_org,'finance.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  return query
    select a.id, a.code, a.name, a.type,
           coalesce(sum(l.debit),0), coalesce(sum(l.credit),0),
           case when a.type in ('asset','expense')
                then coalesce(sum(l.debit),0) - coalesce(sum(l.credit),0)
                else coalesce(sum(l.credit),0) - coalesce(sum(l.debit),0) end
    from public.ledger_accounts a
    left join (public.journal_lines l
               join public.journal_entries e on e.id = l.entry_id
                and e.status = 'posted'
                and (p_as_of is null or e.entry_date <= p_as_of))
      on l.account_id = a.id
    where a.org_id = p_org
    group by a.id, a.code, a.name, a.type
    order by a.code;
end;
$$;

-- O "Caixa" do plano padrão é dinheiro físico (ícone de carteira, spec 11): marca nas igrejas
-- existentes (só se ninguém mexeu) e nas novas, pelo seed.
update public.ledger_accounts set bank_code = 'caixa' where code = '1.1.01' and name = 'Caixa' and bank_code is null;

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
   (p_org,'3','Patrimônio','equity'),
   (p_org,'3.1','Patrimônio Social','equity'),
   (p_org,'3.1.01','Saldo Acumulado','equity'),
   (p_org,'4','Receitas','revenue'),
   (p_org,'4.1','Contribuições','revenue'),
   (p_org,'4.1.01','Dízimos','revenue'),
   (p_org,'4.1.02','Ofertas','revenue'),
   (p_org,'4.1.03','Doações','revenue'),
   (p_org,'4.1.99','Outras Receitas','revenue'),
   (p_org,'5','Despesas','expense'),
   (p_org,'5.1','Despesas Operacionais','expense'),
   (p_org,'5.1.01','Salários e Encargos','expense'),
   (p_org,'5.1.02','Aluguel','expense'),
   (p_org,'5.1.03','Água, luz e internet','expense'),
   (p_org,'5.1.04','Missões','expense'),
   (p_org,'5.1.05','Manutenção','expense'),
   (p_org,'5.1.06','Eventos','expense'),
   (p_org,'5.1.99','Outras Despesas','expense');
  update public.ledger_accounts c
     set parent_id = p.id
    from public.ledger_accounts p
   where c.org_id = p_org and p.org_id = p_org
     and position('.' in c.code) > 0
     and p.code = left(c.code, length(c.code) - position('.' in reverse(c.code)));
  update public.ledger_accounts set bank_code = 'caixa' where org_id = p_org and code = '1.1.01';
end;
$$;
