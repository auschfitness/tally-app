-- m50 — Planos Fase 1 (sem cobranca): admin troca o plano da igreja.
-- Unica peca de DB; catalogo de planos vive em codigo. organizations.plan ja existe (m47).
-- Espelha admin_set_org_status: SECURITY DEFINER, gated is_platform_admin() por dentro.

create or replace function public.admin_set_org_plan(p_org uuid, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_plan not in ('free','pro') then raise exception 'invalid_plan' using errcode='22023'; end if;
  update public.organizations set plan = p_plan where id = p_org;
end;
$$;

revoke execute on function public.admin_set_org_plan(uuid, text) from public, anon;
grant execute on function public.admin_set_org_plan(uuid, text) to authenticated;

-- Grandfather: as 5 orgs atuais viram 'pro' (ninguem perde acesso ao que ja usa).
-- Org nova nasce 'free' (default da coluna).
update public.organizations set plan = 'pro' where plan is distinct from 'pro';
