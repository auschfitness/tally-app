-- m65 — Comprovantes (spec 12, fase C). Um arquivo, até duas ligações: a conta (bill_id) e o
-- lançamento (journal_entry_id). Ao pagar a conta, o anexo passa a apontar também para o
-- lançamento que nasceu dela; ao desfazer, perde só essa segunda ligação.
-- Arquivo no bucket privado finance-files, caminho "<org_id>/<uuid>.<ext>".

create table if not exists public.finance_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bill_id uuid references public.finance_bills(id) on delete cascade,
  journal_entry_id uuid references public.journal_entries(id) on delete cascade,
  path text not null unique,
  name text not null,
  mime text not null,
  size int not null check (size > 0 and size <= 10485760),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint finance_files_target check (bill_id is not null or journal_entry_id is not null)
);
create index if not exists idx_finance_files_bill on public.finance_files(bill_id);
create index if not exists idx_finance_files_entry on public.finance_files(journal_entry_id);
create index if not exists idx_finance_files_org on public.finance_files(org_id);

alter table public.finance_files enable row level security;
drop policy if exists finance_files_all on public.finance_files;
create policy finance_files_all on public.finance_files for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finance-files', 'finance-files', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- A primeira pasta do caminho é a org; só quem cuida das finanças dela lê e grava.
create or replace function public.finance_file_allowed(p_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then has_perm(((storage.foldername(p_name))[1])::uuid, 'finance.manage')
    else false
  end
$$;
revoke execute on function public.finance_file_allowed(text) from public, anon;
grant execute on function public.finance_file_allowed(text) to authenticated;

drop policy if exists finance_files_read on storage.objects;
create policy finance_files_read on storage.objects for select to authenticated
  using (bucket_id = 'finance-files' and public.finance_file_allowed(name));
drop policy if exists finance_files_insert on storage.objects;
create policy finance_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'finance-files' and public.finance_file_allowed(name));
drop policy if exists finance_files_delete on storage.objects;
create policy finance_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'finance-files' and public.finance_file_allowed(name));

-- pay_bill/unpay_bill de m64 + os anexos seguindo a conta.
create or replace function public.pay_bill(p_bill uuid, p_date date, p_account uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b public.finance_bills%rowtype;
  v_entry uuid;
begin
  select * into b from public.finance_bills where id = p_bill for update;
  if b.id is null then raise exception 'conta inexistente' using errcode = '22023'; end if;
  if not has_perm(b.org_id, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'open' then raise exception 'conta ja paga' using errcode = '55000'; end if;

  v_entry := public.record_transaction(b.org_id, b.kind, p_amount, p_date, p_account, b.category_id, b.description);

  update public.finance_bills
     set status = 'paid', paid_on = p_date, paid_amount = round(p_amount, 2),
         journal_entry_id = v_entry, updated_at = now()
   where id = p_bill;
  update public.finance_files set journal_entry_id = v_entry where bill_id = p_bill;
  return v_entry;
end;
$$;

create or replace function public.unpay_bill(p_bill uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.finance_bills%rowtype;
begin
  select * into b from public.finance_bills where id = p_bill for update;
  if b.id is null then raise exception 'conta inexistente' using errcode = '22023'; end if;
  if not has_perm(b.org_id, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'paid' then return; end if;

  if b.journal_entry_id is not null
     and exists (select 1 from public.journal_entries where id = b.journal_entry_id and status = 'posted') then
    perform public.void_journal_entry(b.journal_entry_id);
  end if;

  update public.finance_files set journal_entry_id = null where bill_id = p_bill;
  update public.finance_bills
     set status = 'open', paid_on = null, paid_amount = null, journal_entry_id = null, updated_at = now()
   where id = p_bill;
end;
$$;
