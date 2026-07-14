# Fase 1 — Auditoria do app atual (Tally, JS vanilla → Next.js)

> Fonte da verdade é o código em `tally-app/src`. Este documento inventaria o
> comportamento observado para guiar a migração com paridade. Nenhuma mudança de
> comportamento é proposta aqui.

## 1. Visão geral da arquitetura atual

- **Stack**: Vite + JavaScript vanilla (ES modules), sem framework. Chart.js e
  `@supabase/supabase-js` via npm. Deploy estático (Vercel detecta Vite → `dist/`).
- **Casca**: `index.html` contém o layout inteiro (sidebar fixa com `.navitem[data-view]`,
  topbar com igreja/campus/tema, `#content` vazio, `#modalHost`, `#gate`). Um único
  `<script type="module" src="/src/main.js">`.
- **Entrada** (`main.js`): importa CSS, aplica tema, importa `core/events.js` (que por
  transitividade importa todas as telas) e chama `startApp()`. Em dev, expõe
  `__tallyPreview`, `__tallyState`, `__tallyInject` (hooks de teste/preview sem login).
- **Estado** (`core/state.js`): **um único objeto global mutável** `state`. `emptyState()`
  define ~70 campos (view atual, filtros de UI, e as coleções de dados: people, groups,
  prayers, entries, sessions, sermons, teams, services, events, journey, etc.). `setState`
  troca o objeto inteiro (no load). As telas **mutam campos diretamente** (`state.people.push`,
  `state.view=...`) — binding vivo via import.
- **Sessão** (`core/session.js`): `SB` (cliente Supabase), `ORG_ID`, `USER` — "bindings vivos"
  reatribuídos por setters. Padrão global compartilhado por todos os módulos.
- **Render** (`core/render.js`): `render()` atualiza contadores do menu, seletor de
  instituição/campus, e injeta a tela atual via `#content.innerHTML = viewFn()`. As views são
  **funções que retornam strings de HTML**. Re-dispara a classe `.view-in` (transição), e agenda
  `renderCharts` / `layoutPrayerCloud` / `mountSermonEditor` no próximo frame.
- **Eventos** (`core/events.js`): navegação (`.navitem`), tema, logout, e **delegação global de
  clique/change** por atributos `data-*` (data-campus, data-inst, data-tab, data-seen, data-edit,
  data-toggle, data-deltask, data-delentry, data-rm, data-add, ids de botões "+"). Cada tela
  registra seus próprios `document.addEventListener("click", …)` adicionais (com `.closest`).
- **Persistência**: **modelo híbrido / dual-write**:
  1. `core/persist.js` `save()` — upsert do **objeto state inteiro** como JSON no `app_state`
     (debounce 400ms). Ainda é o mecanismo primário para muitos sub-campos.
  2. **Repos relacionais** (`core/*-repo.js`) — cada entidade tem `hydrate*` (lê tabela → state)
     e `upsert*/delete*` (escreve tabela). Migração relacional (Fase 2 do projeto antigo) já
     cobriu ~20 entidades, mas o `save()` do blob continua rodando em paralelo.
- **Auth**: `@supabase/supabase-js` no **navegador**, sessão em **localStorage** (padrão do
  supabase-js, sem `@supabase/ssr`). Fluxo: `startApp()` → `getSession()` → se logado
  `afterAuth()`, senão `showAuth('login')`. E-mail+senha (`signInWithPassword`/`signUp`),
  Google OAuth (`signInWithOAuth`, redirectTo=origin). Onboarding cria org via RPC `create_org`.
  Sem membership → onboarding; com membership → `loadOrg` (lê `app_state`, faz hydrate dos repos).
- **Tema** (`core/theme.js`): claro/escuro via `data-theme` no `<html>`; **única coisa em
  localStorage** (`tally_theme`). Sem preferência = system.
- **Multi-tenant**: isolamento por org via `memberships` + **RLS** em todas as tabelas. Funções
  auxiliares no banco (`is_org_member`, `has_perm`, etc.). O front filtra por `activeCampus`
  em memória (não por org — RLS cuida da org).

## 2. Inteligência derivada (`core/derived.js`) — o coração do produto

Tudo **calculado** a partir do `state` (nunca persistido, nunca "score"):
- `careReasons(p)`, `unaccounted()`, `inCampus(p)` — Care Radar.
- `groupsHealth()`, `riskDist()`, `communityInsights()` — saúde de grupos/comunidade.
- `signals()` / `activeSignals()` / `serviceSignals()` / `serviceEventSignals()` — o motor de
  Signals que alimenta Inbox e Home. Deriva de pessoas, grupos, tarefas, times, escala, cultos,
  eventos, milestones. `signalOverrides` (dismiss/status) persistido no state.
- `journeyStats/Funnel/FirstVisitDrop/Movement` — analytics de Journey (dados reais + campos
  ilustrativos declarados).
- `attendanceSeries()`, `financeMonthly()`, `expenseByCat()` — séries p/ gráficos (algumas ainda
  **ilustrativas** por falta de histórico — documentado no CLAUDE.md DNA #2).
- `prayerCloudData()`, `prayerMatch()`, `prunePrayers()`, `ansLeft()` — nuvem de oração.
- `stickTimeline(p)` — a Timeline (memória da igreja) montada de milestones+sessões+orações+care.

**Risco de migração**: esta camada é pura (state → view models) e deve virar `features/*/queries`
+ serviços de domínio compartilhados. É a parte com mais regra de negócio — preservar 1:1.

## 3. Mapeamento Supabase (46 tabelas, RLS em todas)

Cliente único no navegador (anon key pública em `config.js`, protegida por RLS). RPC `create_org`.
Tabelas por domínio (contagem de linhas hoje entre parênteses — base de teste pequena):

- **Tenancy/acesso**: organizations(2), campuses(3), profiles(0), roles(6), memberships(1)
- **Pessoas**: sticks(15), households(1), household_members(2), journey_stages(12),
  milestone_types(10), milestones(4)
- **Comunidade/presença**: groups(8), group_members(7), services(0), events(0),
  attendance_sessions(1), attendance_records(5)
- **Journey**: journeys(2), stick_journey_records(5)
- **Trilhas**: tracks(0), track_steps(0), track_enrollments(0)
- **Study**: sermons(3), series(1), sermon_scriptures(3), study_notes(1), resources(1)
- **Times/escala**: ministries(2), teams(2), team_members(5), schedule_assignments(3),
  service_plan_items(0)
- **Inteligência**: signals(2), care_items(0), care_notes(0), care_contacts(0), timeline_events(1)
- **Oração/finanças**: prayer_requests(10), funds(4), finance_categories(11), finance_entries(4)
- **Coordenação/estado**: coordination_posts(0), coordination_tasks(0), signal_overrides(0),
  event_registrations(0), **app_state(1)** ← o blob JSON híbrido.

**Chaves**: só anon key no cliente. Nunca service_role. `create_org(p_name,p_currency,p_campus,p_state jsonb)`.

## 4. Débitos técnicos / riscos observados (preservar comportamento, registrar problema)

| # | Observação | Impacto na migração |
|---|---|---|
| D1 | **Estado global mutável único** compartilhado por todas as telas (binding vivo). | Não traduz p/ RSC. Vira: dados do servidor por página + estado de UI local/URL. Maior risco de paridade. |
| D2 | **Dual-write**: `save()` grava o state inteiro em `app_state` *e* repos gravam nas tabelas. Sub-campos (group, milestones, household, journeyStage) ainda vivem só no blob. | Decidir a fonte da verdade por campo. Migração não pode perder os sub-campos do blob. |
| D3 | **Auth só no cliente** (localStorage, sem SSR). "Token no navegador" nunca é autorização. | Migrar p/ `@supabase/ssr` com cookies + middleware + guarda no servidor. Mudança de comportamento **necessária** (documentada): páginas protegidas no servidor. |
| D4 | **Render por `innerHTML`** + delegação global de eventos por `data-*`. HTML por concatenação de strings (risco de XSS mitigado por `esc()`). | Vira componentes React. `esc()` deixa de ser necessário (React escapa). Auditar cada `innerHTML` com dado do usuário. |
| D5 | **Séries ilustrativas** em `attendanceSeries()` e parte de `financeMonthly()` (fallback quando falta histórico). DNA #2 pede dado real. | Preservar como está (paridade) e marcar como melhoria futura — **não** é bug de migração. |
| D6 | `prompt()` nativo em `events.js` (data-add em Configurações) e possivelmente outras telas. | Substituir por modal/input controlado (mudança de UX mínima, documentar). |
| D7 | **Chart.js** desenha em `<canvas>` via `requestAnimationFrame` pós-render. | Client Components nas folhas (gráficos). Wrapper que monta/desmonta e respeita tema. |
| D8 | `signalOverrides`, filtros de UI e vários `*Detail`/`*Edit` guardados no `state` global e **persistidos no blob**. | Estado de UI → local/URL; `signalOverrides` (decisão do usuário) → tabela `signal_overrides` (já existe) ou app_state. |
| D9 | Nuvem de oração faz **layout manual** (`layoutPrayerCloud` via rAF, mede DOM). | Client Component isolado; preservar algoritmo de layout. |
| D10 | Editor de sermão usa **contenteditable** e `mountSermonEditor` imperativo. | Client Component controlado; preservar seções (Esboço/Notas/Ilustrações/Aplicação/Resposta de oração) e glossário PT-BR. |
| D11 | Preview/verificação dev via `__tallyPreview/__tallyInject/__tallyState` e teste de paridade `test/compare.mjs` contra `reference/original-monolith.html`. | **Não se aplica** ao Next (spec). Verificação vira typecheck+lint+build+testes de fluxo. |

## 5. Estratégia de coexistência (branch `refactor/nextjs`)

- App JS puro **permanece intacto** na branch e no ar na `main` até o cut-over (Fase 6).
- O app Next é construído em **`tally-app/web/`** (subpasta isolada): dois `package.json`/build
  independentes, sem colisão de `src/`, `index.html`, `vite.config.js`. No cut-over, o conteúdo
  de `web/` vira o app publicado e o legado é removido **após** validação de equivalência.
- Banco **preservado** (schema/RLS do orquestrador). Tipos gerados via MCP Supabase (read-only).
- Deploy Vercel: hoje aponta p/ o app Vite. Reconfigurar root/preset p/ `web/` é passo de cut-over
  (documentado; não altera a `main`).
