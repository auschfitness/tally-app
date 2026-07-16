# Tally — contexto do projeto (para o Claude Code)

Este arquivo dá ao Claude Code o contexto completo do Tally. Leia-o inteiro antes de agir. O dono do projeto (Gaybiel) é de marketing, não é dev; explique decisões técnicas em linguagem clara e peça aprovação antes de mudanças grandes.

> **ATUALIZAÇÃO (jul/2026 — cut-over feito):** o app agora é **Next.js (App Router) + TypeScript estrito + Supabase SSR**, na **raiz** do repositório (`src/`, features em `src/features/<f>/`, rotas em `src/app/`). O app legado Vite (descrito abaixo em "Estado atual do código") foi **aposentado** — vive só na tag git `backup/legacy-vite`. Verificação hoje é **`npm run verify`** (typecheck+lint+test+build) + e2e Playwright, não mais o teste de paridade. As seções abaixo sobre estrutura Vite/`npm run dev` na 5173/`npm test` de paridade são **históricas**. O que continua válido: produto, marca, DNA, glossário PT-BR, modelo de dados Supabase e RLS.

## O que é o Tally

Tally é um **Church OS**: um sistema operacional para igrejas com uma camada de inteligência pastoral. Filosofia: "um gerente vê 99%, um pastor vê o um" — ninguém deve passar despercebido. Marca em azul (#2B5CE6), tipografia Poppins, tema claro por padrão (dark mode disponível). Público: Brasil e EUA (PT/EN/ES no roadmap; hoje o app está em PT). Multi-campus e multi-instituição são requisitos de arquitetura.

Voz da interface: madura, calma, prática. Nada de linguagem religiosa artificial ("Amém! Relatório pronto!"). Prefira contexto e padrões a "scores" ("Ruth pode precisar de atenção" + o porquê, nunca "Ruth — 87% de risco").

## Estado atual do código

Projeto **Vite** com **JavaScript vanilla** organizado em **módulos ES** (sem framework). Chart.js e supabase-js vêm via **npm** (não mais CDN). Este repositório (`tally-app/`) é o app.

- Os **dados** ficam no **Supabase**, não no código. Persistência atual: um blob JSON por organização na tabela `app_state` (isolado por RLS). As tabelas relacionais completas já existem e são o alvo da migração fina (Fase 2, abaixo).
- Autenticação: e-mail+senha (funcionando) e botão de Google (a habilitar). Onboarding cria a igreja via RPC `create_org`.
- O app é totalmente funcional; a modularização preservou 100% do comportamento e do visual do protótipo original. **Não descarte funcionalidade existente** ao refatorar.

### Estrutura

```
index.html            Casca da página (esqueleto + <script type="module">)
src/
  main.js             Entrada: CSS, tema, listeners globais, início do app
  config.js           URL + chave PÚBLICA (anon) do Supabase
  styles.css          Todo o CSS
  core/               state, session, persist, supabase, theme, helpers,
                      format, derived (inteligência), render, events
  ui/                 modal, charts (Chart.js)
  views/              uma tela por arquivo: home, inbox, sticks, care,
                      journey, groups, coordination, prayer, finance, settings
  dev/seed.js         Dados de exemplo — SÓ fixture de dev/teste; NÃO vai pro build
test/compare.mjs      Teste de paridade (código modular × original)
reference/            original-monolith.html — o app original de 1 arquivo (base do teste)
```

Conceito importante: **uma pessoa = uma Stick**. Nunca crie bancos separados para visitante/membro/voluntário/criança; são relações e estágios da mesma Stick.

### Rodar e verificar

Precisa de Node 18+ (testado no 24). A partir da raiz do repo:

- `npm install` — instala dependências (uma vez).
- `npm run dev` — servidor de desenvolvimento em http://localhost:5173. No console do navegador, `__tallyPreview('<tela>')` renderiza qualquer tela com dados de exemplo, sem login (só em dev).
- `npm test` — **teste de paridade**: compara o HTML de todas as telas do código modular com o original de `reference/` e abre todos os modais. Rode após qualquer mudança.
- `npm run build` — gera `dist/` (site estático pronto para publicar).
- Skill **`/verify-app`** — roda `npm test` + `npm run build` isolado e devolve só o veredito (verde/vermelho).

### Fase 2 (próxima, não iniciada)

Migrar a persistência do blob `app_state` para as tabelas relacionais que já existem no Supabase (sticks, groups, attendance, signals, care, etc.), módulo a módulo, testando localmente. Comece por Sticks e Grupos. Refine o RLS por capability nos módulos novos (#4 em diante) antes de construí-los.

## Supabase

- Project ref / ID: `zzgxeylyrtzsqcdguxql`
- API URL: `https://zzgxeylyrtzsqcdguxql.supabase.co`
- anon key (JWT, pública, segura no client): em `src/config.js`. Protegida pelo RLS.
- **Nunca** exponha a service_role key no client.
- Conecte o MCP do Supabase no Claude Code: `claude mcp add --transport http supabase https://mcp.supabase.com/mcp` (e autentique).

### Modelo de dados (tabelas já criadas, RLS ativo em todas)
- Tenancy/acesso: organizations, campuses, profiles, roles, memberships
- Pessoas (Sticks): sticks, households, household_members, journey_stages, milestone_types, milestones
- Comunidade/presença: groups, group_members, services, events, attendance_sessions, attendance_records
- Inteligência: signals, care_items, care_notes, care_contacts, timeline_events
- Oração/finanças: prayer_requests, funds, finance_categories, finance_entries
- Coordenação/estado: coordination_posts, coordination_tasks, signal_overrides, app_state

### RLS
Isolamento por organização via `memberships`. Funções auxiliares (SECURITY DEFINER, sem execução para anon): `is_org_member(org)`, `has_perm(org, perm)`, `org_has_no_members`, `shares_org`. Care e orações privadas exigem permissão (`care.view`, `prayer.view_private`). Bootstrap de org via RPC `public.create_org(p_name, p_currency, p_campus, p_state jsonb)` — cria org + membership(owner) + campus + app_state atomicamente usando auth.uid().

## Roadmap (fonte da verdade: Notion, caderno "Tally")
São 12 steps (#1 a #12) no Notion do dono. Já implementados: #1 (arquitetura Church OS), #2 (Sticks: pessoas, households, timeline, presença, milestones), #3 (Signals, Care, Inbox). Faltam #4 a #12 (Groups/Teams, Services/Attendance, Journey completa, Giving/Finance, Kids, Study, Events, Communication, etc.). Peça ao dono para colar cada step ao implementar.

### Tally Product DNA (regras)
1. Sem módulos isolados: todo módulo se conecta a uma Stick, gera/consome Signals, aparece na Timeline, influencia a Journey.
2. Dados antes da UI: nada de gráfico falso; cada visual representa relações reais. (Hoje a tendência de presença e alguns meses de finanças ainda são ilustrativos por falta de histórico — troque por dados reais.)
3. Humano primeiro: sem score de risco/engajamento/espiritual. Use contexto, padrões, oportunidades de cuidado.
4. Toda ação cria histórico (timeline_events é a memória da igreja).
5. Construa para o pastor primeiro: "se um pastor abrir esta página na segunda de manhã, ela o ajuda a entender a igreja?".

## Deploy
Recomendado: repositório no GitHub ligado ao Vercel (auto-deploy a cada push). O app é estático (build do Vite → `dist/`; a Vercel detecta o Vite sozinha). Após o deploy, adicione a URL do Vercel em Supabase → Authentication → URL Configuration (Site URL + Redirect URLs) — necessário para o Google OAuth. "Confirm email" está desligado (login por e-mail+senha entra na hora).

## Convenções
- **Fundação de Design: `docs/design-principles.md` GOVERNA toda tela nova ou alterada** (norte macOS/ChatGPT: uma ação primária por tela, revelação progressiva, ar no lugar de caixas, cor contida, controles nativos sempre estilizados ao tema claro E escuro, movimento como função). Leia antes de mexer em UI; se um design conflita com o doc, o doc vence. Tokens de movimento (`--dur-micro`/`--dur-panel`/`--ease`) e as interações base (hover/press, modal/drawer, troca de view via `.content.view-in`) vivem em `src/styles.css` — reuse, respeitando `prefers-reduced-motion`.
- Preserve o sistema visual atual (claro, interativo, gráficos clicáveis, drill-down, densidade organizada).
- A interface é em **português (PT-BR)**. Traduza qualquer inglês que vaze na UI, exceto os termos abaixo.
- Termos de produto (não traduzir): Stick(s), Signal, Care, Journey, Milestone, Pulse, Inbox. Rótulo do botão de adicionar pessoa: "Nova pessoa". Use "Campus" (não "Campi").
- **Nomes de feature intencionalmente em inglês** (usados assim no material de marca do dono — manter): Finance Lite, Care Radar, Journey Map. "Timeline" é tratada como conceito do Tally (a memória da igreja) e fica em inglês.
- **Glossário PT-BR de termos do Study** (traduções fixadas — não regredir): Outline → **Esboço**; Big idea → **Ideia central**; Overview (aba da Stick) → **Visão geral**. Seções do sermão: Esboço, Notas, Ilustrações, Aplicação, Resposta de oração. Exemplos de passagem na UI em PT ("João 10:1-18", não "John").
- Rode `npm test` (ou `/verify-app`) e teste no navegador antes de dar por pronto. Valide antes de fazer deploy.
- Ao dividir/mover código, mantenha os corpos das funções idênticos; o teste de paridade é a rede de segurança.

## Marca (arquivos fora deste repo, na pasta TALLY)
`Tally-Logo-*.svg/eps/pdf/png`, `Tally-IDV-Apresentacao.pdf`, `Tally-Fundacao-Marca-Produto.html`. Guias: `Tally-Supabase-Guia.md`, `Tally-Relatorio-Noite.md`.
