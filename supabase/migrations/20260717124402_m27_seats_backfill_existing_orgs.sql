-- Backfill dos assentos nas orgs existentes.

-- 1) Orgs SEM papéis de sistema (Convergence, Tally Test) recebem os 6 cargos PT-BR.
insert into public.roles(org_id, name, permissions, is_system)
select o.id, v.name, v.perms, true
from public.organizations o
cross join (values
  ('Dono', array[]::text[]),
  ('Pastor', array['sticks.edit','care.view','care.manage','prayer.view_private','prayer.manage','groups.manage_all','org.manage','members.manage']),
  ('Tesoureiro', array['finance.manage','members.manage']),
  ('Equipe de Cuidado', array['sticks.edit','care.view']),
  ('Líder de Grupo', array['groups.manage_assigned']),
  ('Membro', array[]::text[])
) as v(name, perms)
where not exists (select 1 from public.roles r where r.org_id = o.id and r.is_system);

-- 2) Grace Church (org de teste): renomear os papéis EN -> PT-BR + garantir members.manage.
update public.roles set name = 'Dono'              where is_system and name = 'Owner';
update public.roles set name = 'Tesoureiro'         where is_system and name = 'Treasurer';
update public.roles set name = 'Equipe de Cuidado'  where is_system and name = 'Care Team';
update public.roles set name = 'Líder de Grupo'      where is_system and name = 'Group Leader';
update public.roles set name = 'Membro'             where is_system and name = 'Member';
update public.roles
  set permissions = (select array(select distinct unnest(permissions || array['members.manage'])))
  where is_system and name in ('Pastor','Tesoureiro') and not (permissions @> array['members.manage']);

-- 3) Todo dono (is_owner) sem cargo atribuído recebe o cargo "Dono" da sua org.
update public.memberships m
  set role_id = (select id from public.roles r where r.org_id = m.org_id and r.name = 'Dono' and r.is_system limit 1)
  where m.is_owner and m.role_id is null;
