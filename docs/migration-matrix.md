# Fase 1 — Matriz de migração (JS vanilla → Next.js App Router)

Destino padrão: `web/src/features/<feature>/` (fatia vertical: `page`/`components`/`queries`/
`actions`/`schemas`/`types`/`*.module.css`) + rota em `web/src/app/(dashboard)/<rota>/`.
Regra: **Server Component busca dados** (via `queries/`), **Client Component** só nas folhas
interativas (gráficos, editores, modais, filtros); **mutações via Server Actions** (`actions/`).

## Legenda de estratégia
- **RSC**: página é Server Component; dados no servidor via query tipada.
- **CC-leaf**: interação isolada em Client Component pequeno.
- **SA**: mutação por Server Action (valida → sessão → autorização → Supabase → revalida).
- **URL**: estado de filtro/aba/seleção em searchParams (compartilhável) em vez de `state.*`.

## Matriz

| # | Feature (nav key) | Arquivos atuais | Dependências | Destino Next | Estratégia | Riscos |
|---|---|---|---|---|---|---|
| 1 | **Home/Dashboard** (`dashboard`) | views/home.js | derived.*, charts (att/risk donut), sub-painéis Comunidade/Estudo/Celebrar | features/home + app/(dashboard)/page.tsx | RSC agrega queries de várias features; gráficos CC-leaf; painéis lêem serviços de domínio | Alto acoplamento cross-feature (lê people/groups/journey/study/signals). Séries ilustrativas D5. |
| 2 | **Inbox** (`inbox`) | views/inbox.js | derived signals, signal_overrides | features/inbox | RSC lista `activeSignals()`; filtro de categoria via URL; dismiss/snooze SA→signal_overrides | `setSig` hoje grava no blob; migrar p/ tabela `signal_overrides` (existe, 0 linhas). |
| 3 | **Sticks/Pessoas** (`people`) | views/sticks.js | sticks-repo, group-members-repo, journey-repo, milestones (blob), households (blob), attendance | features/sticks | RSC lista+detalhe; person/checkin modais CC; upsert/archive/seen SA | Entidade central. Sub-campos (group, milestones, household) ainda no blob (D2). Timeline derivada. |
| 4 | **Care** (`care`) | views/care.js | state.careItems (**só blob**), signal overrides | features/care | RSC lê care_items; assign/contact/resolve SA | **Care Items só no blob** hoje; tabelas care_items/care_notes/care_contacts existem (0 linhas) → migrar. |
| 5 | **Journey** (`journey`) | views/journey.js | derived journeyStats/Funnel/Drop/Movement, journey-repo | features/journey | RSC (analytics puros); foco de estágio via URL | Analytics dependem de stick_journey_records + timeline. Preservar cálculo 1:1. |
| 6 | **Groups/Saúde** (`groups`) | views/groups.js | groups-repo, group-members-repo, attendance-repo, charts donut | features/groups | RSC lista+detalhe; donut CC; new-group/attendance/leader SA | `g.leader` no blob (merge por id). Presença cria sessions+records. |
| 7 | **Teams/Serviço** (`teams`) | views/teams.js | teams-repo, ministries-repo, schedule-repo | features/teams | RSC ministries/teams/detail/schedule; modais CC; CRUD+status+escala SA | `leadershipDev` **só no blob**. Escala com ciclo de status. `window.confirm`→confirm modal (D6). |
| 8 | **Services/Cultos** (`services`) | views/services.js | services-repo, service-plan-repo, attendance, sermons, schedule | features/services | RSC lista+detalhe; plan CRUD+reorder SA; checkin reusa Sticks | Barras inline (sem Chart.js). Reorder = swap de position. |
| 9 | **Events/Eventos** (`events`) | views/events.js | events-repo (events+event_registrations) | features/events | RSC lista+detalhe; event CRUD + registro/checkin interno SA | Registro identifica visitante **sem** criar Stick (preservar). Inscrição pública ADIADA. |
| 10 | **Calendar/Agenda** (`calendar`) | views/calendar.js | agrega services/events/schedule/teams (state já hidratado) | features/calendar | RSC agrega queries; agenda/semana/mês + filtro via URL | Projeção de recorrência de cultos = data math pura. Cross-nav p/ service/event/teams. |
| 11 | **Study/Trilhas** (`study`) | views/study.js | tracks-repo (tracks/steps/enrollments), milestones, timeline | features/tracks | RSC lista+detalhe; add step/enroll/advance SA | `advanceStep` no último passo cria milestone+timeline. Link p/ sermão (cross-feature). |
| 12 | **Study/Sermões** (`sermons`) | views/sermons.js (759 ln) | sermons/series/notes/resources/scriptures repos, bible-source (**API externa**), scripture-parse, bible-books | features/study | RSC biblioteca/série/notas/busca; **editor CC** (autosave, contenteditable-like); assistente CC; compare CC | **Maior risco.** 3 listeners globais, autosave sem re-render (preservar cursor), fetch externo helloao, glossário PT-BR fixo. Fatiar em subcomponentes. |
| 13 | **Coordination** (`coordination`) | views/coordination.js | state.posts/tasks (**só blob**) | features/coordination | RSC lê posts/tasks; post/task modais CC; CRUD+toggle SA | **Só no blob**; tabelas coordination_posts/coordination_tasks existem (0 linhas) → migrar. |
| 14 | **Prayer/Oração** (`prayer`) | views/prayer.js | prayer-repo, prunePrayers | features/prayer | RSC lista+métricas; **nuvem CC** (layout espiral, resize/fonts.ready); new/pray/answer SA | Layout mede DOM (D9). Filtro por palavra via URL. Prune de respondidas +30d. |
| 15 | **Finance Lite** (`finance`) | views/finance.js | finance-repo, charts (bars+donut) | features/finance | RSC saldos/tabela; gráficos CC; new-entry SA | categoria/fundo denormalizados (texto). `prompt()` nova categoria → modal (D6). Meses ilustrativos D5. |
| 16 | **Settings/Config** (`settings`) | views/settings.js | institution/account config (**só blob**), tema (localStorage) | features/settings | RSC lê config; forms SA (currency/name/lang/tz, tags campus/fund/cat, multi-inst) | Config só no blob. `prompt()` de tag → input (D6). Tema fica em cookie (SSR-safe). |

## Superfície compartilhada (não é feature)
| Área | Atual | Destino |
|---|---|---|
| Casca/nav | index.html + render.js (menu/topbar) + events.js (nav) | app/(dashboard)/layout.tsx + components/shared/Sidebar, Topbar (CC p/ estado ativo) |
| Estado global | core/state.js | **eliminado** — dados no servidor por página; UI em local/URL; prefs (tema) em cookie |
| Sessão | core/session.js (SB/ORG_ID/USER) | lib/supabase/{client,server}.ts + guarda de sessão no servidor; org_id derivado no servidor |
| Persistência blob | persist.js `save()` | **removido ao migrar cada feature**; app_state fica só p/ o que ainda não tem tabela (D2) |
| Auth/onboarding | supabase.js (gate) | app/(auth)/login + middleware SSR + RPC create_org via SA |
| Tema | theme.js (localStorage) | cookie `tally-theme` + `data-theme` no `<html>` no servidor (sem flash/hydration) |
| Helpers/format | helpers.js, format.js | lib/utils/{date,rel,journey,money}.ts (tipados; `esc` some — React escapa) |
| Inteligência | derived.js | serviços de domínio compartilhados + queries por feature (signals, careReasons, groupsHealth…) |
| Gráficos | ui/charts.js (Chart.js) | components/shared/charts/* (CC-leaf, tema-aware, cleanup) |
| Modal | ui/modal.js | components/ui/{Modal,Drawer}.tsx (CC) |
| Bíblia | bible-books/bible-source/scripture-parse | features/study/lib/* (parser puro; fetch externo via route handler ou server util com cache) |

## Ordem de migração proposta (Fase 4)
1. **Sticks** (entidade central; valida o padrão RSC+SA+query e o merge blob↔relacional).
2. **Prayer** e **Finance** (repos limpos, bom teste de gráficos/CC-leaf e SA de CRUD).
3. **Groups** + **Journey** (dependem de Sticks; presença/estágios).
4. **Teams/Services/Events/Calendar** (Step 6/7; escala, plano, agenda).
5. **Study/Sermons** + **Tracks** (o mais pesado; deixar maduro o padrão de editor CC).
6. **Care** + **Coordination** (migrar do blob p/ tabelas que já existem).
7. **Inbox** + **Home** (agregam tudo; migram por último, quando as fontes existem).
8. **Settings** (config; decidir blob vs tabelas de config).

## Entidades que hoje persistem SÓ no blob `app_state` (exigem decisão/migração)
- Care Items (`state.careItems`) → tabelas care_items/care_notes/care_contacts (existem, vazias).
- Coordenação (`state.posts`, `state.tasks`) → coordination_posts/coordination_tasks (existem, vazias).
- Leadership Dev (`state.leadershipDev`) → sem tabela; manter no app_state ou criar coluna.
- Sub-campos de Stick: `group` (há group_members mas nome ainda no blob), `milestones[]`,
  `household`, alguns filtros de UI, `signalOverrides`.
- Config da instituição (funds/catIn/catOut/campuses/multiInstitution) — parcial em tabelas.

> Regra de ouro (spec §D2): ao migrar cada feature, decidir a fonte da verdade por campo e
> **não perder** o que só existe no blob. `app_state` permanece como fallback até a feature estar
> validada ponta a ponta; só então parar de escrever aquele campo no blob.
