-- m61 — Finanças unificado (spec 10). O livro de partidas dobradas (m48) vira a única
-- fonte da verdade: o tesoureiro lança entrada/saída/transferência via record_transaction,
-- que cria um journal_entry postado de 2 partidas (e, se houver doador, a doação ligada).
-- finance_entries/finance_categories ficam aposentadas (não apagadas).
-- Reverter: drop function record_transaction; alter table donations drop column journal_entry_id.

alter table public.donations
  add column if not exists journal_entry_id uuid references public.journal_entries(id) on delete set null;
create index if not exists donations_journal_entry_idx on public.donations(journal_entry_id);

create or replace function public.record_transaction(
  p_org uuid,
  p_kind text,              -- 'in' | 'out' | 'transfer'
  p_amount numeric,
  p_date date,
  p_account uuid,           -- conta (banco/caixa); na transferência, a ORIGEM
  p_counter uuid,           -- categoria (receita/despesa); na transferência, o DESTINO
  p_memo text default null,
  p_fund uuid default null,
  p_donor_stick uuid default null,
  p_donor_name text default null,
  p_method text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric := round(p_amount, 2);
  v_acc ledger_accounts%rowtype;
  v_cnt ledger_accounts%rowtype;
  v_entry uuid;
  v_donor text := nullif(trim(coalesce(p_donor_name, '')), '');
  v_currency text;
begin
  if not has_perm(p_org, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('in', 'out', 'transfer') then raise exception 'tipo de lancamento invalido' using errcode = '22023'; end if;
  if v_amount is null or v_amount <= 0 then raise exception 'lancamento com valor zero' using errcode = '22023'; end if;
  if p_account = p_counter then raise exception 'origem e destino iguais' using errcode = '22023'; end if;

  select * into v_acc from ledger_accounts where id = p_account and org_id = p_org and is_active;
  select * into v_cnt from ledger_accounts where id = p_counter and org_id = p_org and is_active;
  if v_acc.id is null or v_cnt.id is null then raise exception 'conta inexistente' using errcode = '22023'; end if;
  if v_acc.type <> 'asset' then raise exception 'conta precisa ser caixa ou banco' using errcode = '22023'; end if;
  if (p_kind = 'in' and v_cnt.type <> 'revenue')
     or (p_kind = 'out' and v_cnt.type <> 'expense')
     or (p_kind = 'transfer' and v_cnt.type <> 'asset') then
    raise exception 'categoria nao combina com o tipo' using errcode = '22023';
  end if;
  if exists (select 1 from ledger_accounts where parent_id in (p_account, p_counter)) then
    raise exception 'use uma conta final, nao um grupo' using errcode = '22023';
  end if;
  if p_fund is not null and not exists (select 1 from funds where id = p_fund and org_id = p_org) then
    raise exception 'fundo inexistente' using errcode = '22023';
  end if;

  insert into journal_entries (org_id, entry_date, memo, fund_id, created_by)
  values (p_org, coalesce(p_date, current_date), nullif(trim(coalesce(p_memo, '')), ''), p_fund, auth.uid())
  returning id into v_entry;

  -- in: D conta / C receita · out: D despesa / C conta · transfer: D destino / C origem
  insert into journal_lines (org_id, entry_id, account_id, debit, credit, fund_id, line_no) values
    (p_org, v_entry, case when p_kind = 'in' then p_account else p_counter end,
     v_amount, 0, p_fund, 1),
    (p_org, v_entry, case when p_kind = 'in' then p_counter else p_account end,
     0, v_amount, p_fund, 2);

  perform post_journal_entry(v_entry);

  if p_kind = 'in' and (p_donor_stick is not null or v_donor is not null) then
    if p_donor_stick is not null then
      select full_name into v_donor from sticks where id = p_donor_stick and org_id = p_org;
      if v_donor is null then raise exception 'pessoa inexistente' using errcode = '22023'; end if;
    end if;
    select coalesce(currency, 'BRL') into v_currency from organizations where id = p_org;
    insert into donations (org_id, stick_id, donor_name, fund_id, amount, currency, method,
                           donation_date, note, created_by, journal_entry_id)
    values (p_org, p_donor_stick, v_donor, p_fund, v_amount, v_currency,
            case when p_method in ('dinheiro','pix','cartao','transferencia','cheque','outro') then p_method else 'dinheiro' end,
            coalesce(p_date, current_date), nullif(trim(coalesce(p_memo, '')), ''), auth.uid(), v_entry);
  end if;

  return v_entry;
end;
$$;

revoke execute on function public.record_transaction(uuid, text, numeric, date, uuid, uuid, text, uuid, uuid, text, text) from public, anon;
grant execute on function public.record_transaction(uuid, text, numeric, date, uuid, uuid, text, uuid, uuid, text, text) to authenticated;

-- Acentos no plano padrão (só onde a igreja não renomeou).
update public.ledger_accounts a set name = v.novo
from (values
  ('3', 'Patrimonio', 'Patrimônio'),
  ('3.1', 'Patrimonio Social', 'Patrimônio Social'),
  ('4.1', 'Contribuicoes', 'Contribuições'),
  ('4.1.01', 'Dizimos', 'Dízimos'),
  ('4.1.03', 'Doacoes', 'Doações'),
  ('5.1.01', 'Salarios e Encargos', 'Salários e Encargos'),
  ('5.1.03', 'Utilidades (agua/luz/internet)', 'Água, luz e internet'),
  ('5.1.04', 'Missoes', 'Missões'),
  ('5.1.05', 'Manutencao', 'Manutenção')
) as v(code, antigo, novo)
where a.code = v.code and a.name = v.antigo;

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
end;
$$;
