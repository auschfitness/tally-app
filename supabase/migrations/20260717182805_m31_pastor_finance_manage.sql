-- Dono pediu: Pastor também acessa o Giving. finance.manage é o portão (donations/receipts +
-- financeiro geral + fiscal). Aditivo e idempotente nos papéis de sistema Pastor de todas as orgs.
update public.roles
  set permissions = (select array(select distinct unnest(permissions || array['finance.manage'])))
  where is_system = true and name = 'Pastor' and not (permissions @> array['finance.manage']);
