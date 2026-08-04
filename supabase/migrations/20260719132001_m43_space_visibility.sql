
-- m43 — Visibilidade dos espacos. PRE-REQUISITO das contas de membro: sem isto, no dia em
-- que os membros ganharem login eles veriam TUDO (espacos de lideranca, tarefas internas).
-- 'leaders' = so quem tem org.manage; 'members' = qualquer membro logado da org.
-- Default 'leaders' e os espacos existentes ficam fechados (seguro por padrao).

alter table public.spaces
  add column visibility text not null default 'leaders'
  check (visibility in ('leaders','members'));

-- Helpers (SECURITY DEFINER, padrao do projeto) para nao repetir a regra em 8 policies.
create or replace function public.can_see_space(p_space uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.spaces s
    where s.id = p_space
      and is_org_member(s.org_id)
      and (s.visibility = 'members' or has_perm(s.org_id, 'org.manage'))
  );
$$;

create or replace function public.can_see_post(p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.space_posts p
    where p.id = p_post and public.can_see_space(p.space_id)
  );
$$;

-- ---- spaces ----
drop policy if exists spaces_select on public.spaces;
create policy spaces_select on public.spaces for select
  using (is_org_member(org_id) and (visibility = 'members' or has_perm(org_id,'org.manage')));

-- ---- space_posts ----
drop policy if exists space_posts_select on public.space_posts;
drop policy if exists space_posts_insert on public.space_posts;
drop policy if exists space_posts_update on public.space_posts;
drop policy if exists space_posts_delete on public.space_posts;
create policy space_posts_select on public.space_posts for select
  using (can_see_space(space_id));
create policy space_posts_insert on public.space_posts for insert
  with check (can_see_space(space_id) and author_id = (select auth.uid()));
create policy space_posts_update on public.space_posts for update
  using (can_see_space(space_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')))
  with check (can_see_space(space_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')));
create policy space_posts_delete on public.space_posts for delete
  using (can_see_space(space_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')));

-- ---- space_post_comments ----
drop policy if exists space_post_comments_select on public.space_post_comments;
drop policy if exists space_post_comments_insert on public.space_post_comments;
drop policy if exists space_post_comments_update on public.space_post_comments;
drop policy if exists space_post_comments_delete on public.space_post_comments;
create policy space_post_comments_select on public.space_post_comments for select
  using (can_see_post(post_id));
create policy space_post_comments_insert on public.space_post_comments for insert
  with check (can_see_post(post_id) and author_id = (select auth.uid()));
create policy space_post_comments_update on public.space_post_comments for update
  using (can_see_post(post_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')))
  with check (can_see_post(post_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')));
create policy space_post_comments_delete on public.space_post_comments for delete
  using (can_see_post(post_id) and (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')));

-- ---- space_todo_lists ----
drop policy if exists space_todo_lists_select on public.space_todo_lists;
drop policy if exists space_todo_lists_insert on public.space_todo_lists;
drop policy if exists space_todo_lists_update on public.space_todo_lists;
drop policy if exists space_todo_lists_delete on public.space_todo_lists;
create policy space_todo_lists_select on public.space_todo_lists for select
  using (can_see_space(space_id));
create policy space_todo_lists_insert on public.space_todo_lists for insert
  with check (can_see_space(space_id) and created_by = (select auth.uid()));
create policy space_todo_lists_update on public.space_todo_lists for update
  using (can_see_space(space_id) and (created_by = (select auth.uid()) or has_perm(org_id,'org.manage')))
  with check (can_see_space(space_id) and (created_by = (select auth.uid()) or has_perm(org_id,'org.manage')));
create policy space_todo_lists_delete on public.space_todo_lists for delete
  using (can_see_space(space_id) and (created_by = (select auth.uid()) or has_perm(org_id,'org.manage')));

-- ---- space_todos ----
drop policy if exists space_todos_select on public.space_todos;
drop policy if exists space_todos_insert on public.space_todos;
drop policy if exists space_todos_update on public.space_todos;
drop policy if exists space_todos_delete on public.space_todos;
create policy space_todos_select on public.space_todos for select
  using (can_see_space(space_id));
create policy space_todos_insert on public.space_todos for insert
  with check (can_see_space(space_id) and created_by = (select auth.uid()));
create policy space_todos_update on public.space_todos for update
  using (can_see_space(space_id)) with check (can_see_space(space_id));
create policy space_todos_delete on public.space_todos for delete
  using (can_see_space(space_id) and (created_by = (select auth.uid()) or has_perm(org_id,'org.manage')));
