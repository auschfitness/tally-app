-- Endurece next_receipt_number: de count(*)+1 (reusa número após exclusão; corre risco em
-- concorrência) para um CONTADOR ATÔMICO por org+ano. Nunca reusa número (auditoria de recibo
-- fiscal prefere lacuna a reuso); concorrência serializada pelo lock de linha do upsert.
create table if not exists public.receipt_counters (
  org_id  uuid not null references public.organizations(id) on delete cascade,
  year    integer not null,
  last_no integer not null default 0,
  primary key (org_id, year)
);
-- Tabela interna: RLS ligada SEM policy => inacessível pela API; só a função SECURITY DEFINER a toca.
alter table public.receipt_counters enable row level security;

-- Backfill: continua a numeração a partir do maior número já emitido por org+ano (não reinicia).
insert into public.receipt_counters (org_id, year, last_no)
select org_id,
       substring(receipt_no from 1 for 4)::int as year,
       max(substring(receipt_no from 6)::int)  as last_no
from public.donation_receipts
where receipt_no ~ '^[0-9]{4}-[0-9]+$'
group by org_id, substring(receipt_no from 1 for 4)::int
on conflict (org_id, year) do update set last_no = greatest(public.receipt_counters.last_no, excluded.last_no);

create or replace function public.next_receipt_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_year int := extract(year from now())::int; v_n int;
begin
  if not public.has_perm(p_org, 'finance.manage') then
    raise exception 'Sem permissão para emitir recibos nesta organização.';
  end if;
  insert into public.receipt_counters (org_id, year, last_no)
    values (p_org, v_year, 1)
    on conflict (org_id, year)
    do update set last_no = public.receipt_counters.last_no + 1
    returning last_no into v_n;
  return v_year::text || '-' || lpad(v_n::text, 6, '0');
end $function$;
