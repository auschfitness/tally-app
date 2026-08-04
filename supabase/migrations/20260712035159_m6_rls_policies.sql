
create or replace function public.org_has_no_members(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select not exists(select 1 from memberships m where m.org_id=p_org);
$$;

create or replace function public.shares_org(p_other uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from memberships a join memberships b on a.org_id=b.org_id
    where a.user_id=auth.uid() and b.user_id=p_other);
$$;

-- enable RLS on every public table
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- generic org-scoped policy for standard tables
do $$
declare t text;
declare tabs text[] := array[
  'campuses','roles','journey_stages','sticks','households','milestone_types','milestones',
  'groups','services','events','attendance_sessions','signals','funds',
  'finance_categories','finance_entries','timeline_events'];
begin
  foreach t in array tabs loop
    execute format('create policy org_all on public.%I for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));', t);
  end loop;
end $$;

-- organizations
create policy org_select on organizations for select to authenticated using (public.is_org_member(id));
create policy org_insert on organizations for insert to authenticated with check (true);
create policy org_update on organizations for update to authenticated using (public.is_org_member(id)) with check (public.is_org_member(id));

-- profiles (self + same org)
create policy prof_select on profiles for select to authenticated using (id = auth.uid() or public.shares_org(id));
create policy prof_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy prof_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- memberships
create policy mem_select on memberships for select to authenticated using (user_id = auth.uid() or public.is_org_member(org_id));
create policy mem_insert on memberships for insert to authenticated with check (user_id = auth.uid() and (public.org_has_no_members(org_id) or public.has_perm(org_id,'members.manage')));
create policy mem_update on memberships for update to authenticated using (public.has_perm(org_id,'members.manage')) with check (public.has_perm(org_id,'members.manage'));
create policy mem_delete on memberships for delete to authenticated using (public.has_perm(org_id,'members.manage'));

-- household_members via parent household visibility
create policy hhm_all on household_members for all to authenticated
  using (exists(select 1 from households h where h.id = household_id))
  with check (exists(select 1 from households h where h.id = household_id));

-- group_members via parent group visibility
create policy gm_all on group_members for all to authenticated
  using (exists(select 1 from groups g where g.id = group_id))
  with check (exists(select 1 from groups g where g.id = group_id));

-- attendance_records via parent session visibility
create policy attrec_all on attendance_records for all to authenticated
  using (exists(select 1 from attendance_sessions s where s.id = session_id))
  with check (exists(select 1 from attendance_sessions s where s.id = session_id));

-- care_items: require care.view permission (owners bypass)
create policy care_select on care_items for select to authenticated using (public.has_perm(org_id,'care.view'));
create policy care_insert on care_items for insert to authenticated with check (public.has_perm(org_id,'care.view'));
create policy care_update on care_items for update to authenticated using (public.has_perm(org_id,'care.view')) with check (public.has_perm(org_id,'care.view'));
create policy care_delete on care_items for delete to authenticated using (public.has_perm(org_id,'care.manage'));

-- care_notes / care_contacts via parent care item visibility
create policy carenotes_all on care_notes for all to authenticated
  using (exists(select 1 from care_items c where c.id = care_item_id))
  with check (exists(select 1 from care_items c where c.id = care_item_id));
create policy carecontacts_all on care_contacts for all to authenticated
  using (exists(select 1 from care_items c where c.id = care_item_id))
  with check (exists(select 1 from care_items c where c.id = care_item_id));

-- prayer_requests: church-wide visible to members; private requires permission
create policy pray_select on prayer_requests for select to authenticated
  using (public.is_org_member(org_id) and (privacy = 'church' or public.has_perm(org_id,'prayer.view_private')));
create policy pray_insert on prayer_requests for insert to authenticated with check (public.is_org_member(org_id));
create policy pray_update on prayer_requests for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy pray_delete on prayer_requests for delete to authenticated using (public.has_perm(org_id,'prayer.manage'));
