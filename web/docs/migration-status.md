# Estado da migração Next.js

Branch `refactor/nextjs`. App Next em `tally-app/web/`. App JS legado intacto em
`tally-app/` (publicado até o cut-over). Banco preservado; tipos em
`src/lib/database.types.ts` (gerados via MCP Supabase).

## Fases
- [x] **Fase 1 — Auditoria + matriz** — `docs/audit.md`, `docs/migration-matrix.md`.
- [x] **Fase 2 — Fundação** — Next 15 App Router, TS estrito, ESLint, env validado,
  clientes Supabase (browser/server/middleware), auth SSR por cookies (login/OAuth/
  callback/onboarding), guarda no servidor (`lib/auth/session`), tipos do banco.
- [x] **Fase 3 — Casca + design-system** — Sidebar/Topbar/ThemeToggle, tokens/estilos
  globais migrados de `styles.css`, responsivo. Falta ligar a troca de campus ativo
  (hoje estático no Topbar) — fica com a 1ª feature que precisar de estado de campus.
- [~] **Fase 4 — Feature a feature** — em andamento (2/16). **CHECKPOINT** após 2-3
  features para revisão do orquestrador/dono (ver `.tmp/nextjs/CHECKPOINT.md`).
- [ ] **Fase 5 — Validação** — typecheck+lint+**test**+build rodam verdes a cada marco
  (24 testes de unidade). Falta integração+e2e autenticados (precisam da fixture do
  orquestrador — ver `docs/testing.md`).
- [ ] **Fase 6 — Limpeza** — só depois de equivalência: remover legado, reapontar
  Vercel para `web/`, atualizar docs.

## Features (Fase 4) — ordem em docs/migration-matrix.md
- [x] **Sticks** — lista + composição/engajamento + filtros/busca (URL) + cadastro/
  edição/arquivar contra `sticks`. Pendências documentadas em `features/sticks/README.md`
  (perfil/timeline, milestones, check-in, coluna Sinais, eventos de timeline de grupo).
- [x] **Prayer** — mural + nuvem semântica + filtro + orando/respondida/recolocar + novo
  pedido, contra `prayer_requests`. Pendências em `features/prayer/README.md`.
- [ ] Finance (próximo — repo limpo)
- [ ] Groups, Journey
- [ ] Teams, Services, Events, Calendar
- [ ] Study/Sermons, Tracks
- [ ] Care, Coordination (migrar do blob app_state → tabelas que já existem)
- [ ] Inbox, Home (agregam tudo; por último)
- [ ] Settings

## Padrão de referência (provado com Sticks)
`features/<f>/`: `domain.ts` (interface pública) · `types.ts` · `queries.ts`
(RSC, tipado) · `schema.ts` (validação) · `actions.ts` (Server Actions:
validar→sessão/org→Supabase→revalidate) · `components/*` (Client só nas folhas) ·
`README.md`. Página em `app/(dashboard)/<rota>/page.tsx` (Server Component).

## Verificação — limite conhecido
`npm run verify` (typecheck+lint+build) roda verde. O render autenticado das telas
(dados reais atrás de login) **não** foi verificado em runtime nesta sessão: exigiria
um login real, e não criamos conta/org de teste no banco de produção sem autorização.
Para validar ponta a ponta: (a) o dono loga com a conta real da org "Grace Church", ou
(b) autorizar uma conta descartável para E2E. A guarda de rota (não-autenticado →
/login) está verificada pelos logs do servidor.

## Notas de coexistência
- `.claude/launch.json` tem `tally-next` (porta 3000) além do `tally-dev` (Vite 5173).
- Hook `post-commit` publica a branch (preview deploy). Cut-over reaponta a Vercel.
