
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.has_perm(uuid,text) from public;
revoke execute on function public.org_has_no_members(uuid) from public;
revoke execute on function public.shares_org(uuid) from public;
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.has_perm(uuid,text) from anon;
revoke execute on function public.org_has_no_members(uuid) from anon;
revoke execute on function public.shares_org(uuid) from anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_perm(uuid,text) to authenticated;
grant execute on function public.org_has_no_members(uuid) to authenticated;
grant execute on function public.shares_org(uuid) to authenticated;

drop policy org_insert on organizations;
create policy org_insert on organizations for insert to authenticated with check (auth.uid() is not null);
