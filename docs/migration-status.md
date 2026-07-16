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
- [~] **Fase 4 — Feature a feature** — 6/16 migradas e testadas. Inventário completo e
  ordem restante em `.tmp/nextjs/FEATURES-DONE.md`.
- [~] **Fase 5 — Validação** — typecheck+lint+**test**+build verdes a cada marco.
  Fixture do orquestrador ligada: 44 testes (unidade + integração real) + e2e
  (login→dados semeados→logout). Ver `docs/testing.md`.
- [ ] **Fase 6 — Limpeza** — só depois de equivalência: remover legado, reapontar
  Vercel para `web/`, atualizar docs.

## Features (Fase 4) — ordem em docs/migration-matrix.md
- [x] **Sticks** — lista + composição/engajamento + filtros/busca (URL) + cadastro/
  edição/arquivar contra `sticks`. Pendências documentadas em `features/sticks/README.md`
  (perfil/timeline, milestones, check-in, coluna Sinais, eventos de timeline de grupo).
- [x] **Prayer** — mural + nuvem semântica + filtro + orando/respondida/recolocar + novo
  pedido, contra `prayer_requests`. Pendências em `features/prayer/README.md`.
- [x] **Finance Lite** — entradas/saídas, gráficos (barras 6m + donut despesas), saldo
  por fundo, lançamentos + novo, contra `finance_entries`. Só dados reais (DNA #2).
  Novos compartilhados: `components/shared/ConicDonut`, `lib/utils/money`.
- [x] **Saúde dos Grupos** — /groups + /groups/[id], contra groups/group_members/attendance.
- [x] **Journey Map** — /journey, analytics read-only (stick_journey_records/timeline/milestones).
- [x] **Coordenação** — /coordination, migrada do blob → coordination_posts/tasks.
- [ ] **Signals engine** (pré-requisito compartilhado de Care/Inbox/Home — migrar como
  domínio testável antes dessas três).
- [ ] Teams, Services, Events, Calendar (Calendar depois deles)
- [ ] Study/Sermons, Tracks
- [ ] Care, Inbox, Home (dependem do Signals engine)
- [ ] Settings (config; parte ainda no blob)

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
