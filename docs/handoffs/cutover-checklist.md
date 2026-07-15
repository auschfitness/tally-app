# Cut-over (Fase 6) — checklist para trocar o app legado pelo Next.js

> Orquestrador → Claude Code + dono. Só executar quando TODAS as features estiverem migradas
> e verdes. É a fase final; não começar antes.

## Antes do cut-over (pré-requisitos)
- [ ] Todas as 16 features migradas e `npm run verify` verde no `web/`.
- [ ] e2e passando (login → dados → logout) contra a fixture.
- [ ] `get_advisors` (security + performance) sem nada novo/crítico (ação do orquestrador).

## Deploy (dono, com o Claude Code)
- [ ] Apontar a Vercel para o app novo em `web/` (mudar Root Directory do projeto para
      `tally-app/web`, ou criar projeto novo ligado à mesma branch). Next.js detectado sozinho.
- [ ] Deploy da branch → validar a URL de preview antes de promover a produção.

## Supabase Auth (ORQUESTRADOR — necessário p/ login e Google OAuth)
- [ ] Adicionar a URL da Vercel (produção + previews) em **Authentication → URL Configuration**:
      Site URL + Redirect URLs. Sem isso, Google OAuth e magic links quebram.
- [ ] Confirmar que o `web/` usa a **anon/publishable key** correta (NUNCA a service_role).
- [ ] Confirmar que o onboarding novo chama a RPC `create_org` (bootstrap de org + membership
      owner + campus + app_state), igual ao legado.
- [ ] "Confirm email" segue desligado (login e-mail+senha entra na hora) — a menos que decidam
      mudar.

## Verificações de segurança (ORQUESTRADOR)
- [ ] `get_advisors security` limpo: sem tabela sem RLS, sem policy aberta a `anon`.
- [ ] Repo PÚBLICO: rodar um scan final por segredos antes do cut-over (nenhuma service_role,
      nenhuma credencial; `web/.env*` fora do git).
- [ ] Reconfirmar que os helpers SECURITY DEFINER (is_org_member/has_perm/etc.) seguem só para
      `authenticated` (os WARN de advisor sobre eles são esperados e intencionais).

## Aposentar o legado
- [ ] Congelar o app JS na `main` (parar de publicá-lo) só DEPOIS de o novo estar estável em prod.
- [ ] Manter o legado acessível por um tempo como fallback (tag/branch), não apagar de imediato.

## Pendências que voltam à tona no cut-over (decidir com o dono)
- Inscrição pública de eventos + pagamento (RLS anon — migração minha).
- Confidencialidade real de Care por item/nota (migração de RLS minha).
- FKs faltantes em `sermons.service_id`/`preacher_id` (migração minha, se quiserem integridade).
- Enforcement real de `sermons.visibility` (migração minha).
- Versões modernas da Bíblia (licenciamento) + interlinear grego/hebraico (ADIADOS).

— fim.
