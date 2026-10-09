-- m66 — Pessoas (spec 13). Só soma: campos novos na ficha, documentos à parte (LGPD),
-- papel na família, foto, listas salvas e RLS de sticks/famílias apertado.
--
-- Antes: qualquer membro da org (inclusive quem entrou por convite, sem permissão nenhuma)
-- lia e gravava todas as fichas. Agora:
--   ler   = equipe (dono ou alguém com qualquer permissão) OU a própria ficha
--   gravar = members.manage ou sticks.edit
--   CPF/RG = só members.manage, em tabela separada

-- 1. Campos novos (todos opcionais) ---------------------------------------------------------
alter table public.sticks
  add column if not exists marital_status text
    check (marital_status in ('single','married','stable_union','divorced','widowed')),
  add column if not exists profession text,
  add column if not exists church_office text,          -- cargo: sugestões na UI, texto livre
  add column if not exists admission_type text
    check (admission_type in ('baptism','transfer','acclamation','reconciliation','other')),
  add column if not exists exit_date date,
  add column if not exists exit_reason text
    check (exit_reason in ('transfer','moved','deceased','requested','dismissed'));

-- 2. Documentos (só quem gerencia membros) ---------------------------------------------------
create table if not exists public.stick_documents (
  stick_id uuid primary key references public.sticks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),   -- só dígitos
  rg text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_stick_documents_org on public.stick_documents(org_id);
alter table public.stick_documents enable row level security;
drop policy if exists stick_documents_all on public.stick_documents;
create policy stick_documents_all on public.stick_documents for all
  using (has_perm(org_id, 'members.manage')) with check (has_perm(org_id, 'members.manage'));

-- 3. Equipe = dono ou alguém com pelo menos uma permissão (direta ou do cargo) ---------------
create or replace function public.is_org_staff(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from memberships m
    left join roles r on r.id = m.role_id
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.is_owner
        or coalesce(array_length(m.permissions, 1), 0) > 0
        or coalesce(array_length(r.permissions, 1), 0) > 0)
  );
$$;
revoke execute on function public.is_org_staff(uuid) from public, anon;
grant execute on function public.is_org_staff(uuid) to authenticated;

create or replace function public.can_edit_people(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select has_perm(p_org, 'members.manage') or has_perm(p_org, 'sticks.edit');
$$;
revoke execute on function public.can_edit_people(uuid) from public, anon;
grant execute on function public.can_edit_people(uuid) to authenticated;

-- 4. RLS de sticks ------------------------------------------------------------------------
drop policy if exists org_all on public.sticks;
drop policy if exists sticks_read on public.sticks;
drop policy if exists sticks_insert on public.sticks;
drop policy if exists sticks_update on public.sticks;
drop policy if exists sticks_delete on public.sticks;
create policy sticks_read on public.sticks for select
  using (is_org_staff(org_id) or user_id = auth.uid());
create policy sticks_insert on public.sticks for insert with check (can_edit_people(org_id));
create policy sticks_update on public.sticks for update
  using (can_edit_people(org_id)) with check (can_edit_people(org_id));
create policy sticks_delete on public.sticks for delete using (can_edit_people(org_id));

-- 5. Família ----------------------------------------------------------------------------
-- relationship_type passa a ter valores fixos: head (responsável), spouse, child, other.
update public.household_members set relationship_type = 'other'
  where relationship_type is null or relationship_type not in ('head','spouse','child','other');
alter table public.household_members
  alter column relationship_type set default 'other',
  alter column relationship_type set not null;
alter table public.household_members drop constraint if exists household_members_role_chk;
alter table public.household_members add constraint household_members_role_chk
  check (relationship_type in ('head','spouse','child','other'));
-- uma pessoa em uma família só
create unique index if not exists uq_household_members_stick on public.household_members(stick_id);

alter table public.households
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text;

drop policy if exists org_all on public.households;
drop policy if exists households_read on public.households;
drop policy if exists households_write on public.households;
create policy households_read on public.households for select using (is_org_staff(org_id));
create policy households_write on public.households for all
  using (can_edit_people(org_id)) with check (can_edit_people(org_id));

drop policy if exists hhm_all on public.household_members;
drop policy if exists hhm_read on public.household_members;
drop policy if exists hhm_write on public.household_members;
create policy hhm_read on public.household_members for select
  using (exists (select 1 from households h where h.id = household_id and is_org_staff(h.org_id)));
create policy hhm_write on public.household_members for all
  using (exists (select 1 from households h where h.id = household_id and can_edit_people(h.org_id)))
  with check (exists (select 1 from households h where h.id = household_id and can_edit_people(h.org_id)));

-- 6. Listas salvas ------------------------------------------------------------------------
create table if not exists public.people_lists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  filters jsonb not null default '{}'::jsonb,   -- mesmo formato da querystring da lista
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_people_lists_org on public.people_lists(org_id);
alter table public.people_lists enable row level security;
drop policy if exists people_lists_read on public.people_lists;
drop policy if exists people_lists_write on public.people_lists;
create policy people_lists_read on public.people_lists for select using (is_org_staff(org_id));
create policy people_lists_write on public.people_lists for all
  using (can_edit_people(org_id)) with check (can_edit_people(org_id));

-- 7. Foto: bucket privado people-photos, caminho "<org_id>/<stick_id>.<ext>" ---------------
-- sticks.profile_photo guarda o caminho no bucket (não URL).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('people-photos', 'people-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.people_photo_org(p_name text)
returns uuid
language sql immutable set search_path = public as $$
  select case when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid end
$$;

drop policy if exists people_photos_read on storage.objects;
create policy people_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'people-photos' and is_org_staff(public.people_photo_org(name)));
drop policy if exists people_photos_insert on storage.objects;
create policy people_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'people-photos' and can_edit_people(public.people_photo_org(name)));
drop policy if exists people_photos_update on storage.objects;
create policy people_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'people-photos' and can_edit_people(public.people_photo_org(name)));
drop policy if exists people_photos_delete on storage.objects;
create policy people_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'people-photos' and can_edit_people(public.people_photo_org(name)));
