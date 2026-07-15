# Estado do projeto — mapa de retomada (para o orquestrador Cowork)

Se você é o orquestrador (Cowork) num chat NOVO, leia isto + o CLAUDE.md e você está a par. O estado vive em arquivos/Supabase/git, não na memória do chat.

## Divisão de trabalho
- **Orquestrador (Cowork, eu)**: dono do **Supabase** (schema, RLS, migrações, advisors, tipos, fixtures/seed). Escrevo specs/handoffs no repo. Não escrevo o front.
- **Claude Code** (rodado pelo dono no terminal, em `tally-app/`): escreve o **front + testes**. Eu não consigo acioná-lo; o dono é a ponte. Handoff por **arquivo** (eu escrevo em `docs/`/`.tmp/`, ele lê; ele escreve `.tmp/*-DONE.md`, eu leio).
- **Dono**: Gaybiel, marketing, não-dev. Explicar em linguagem clara. Ele aprova decisões e relaya prompts pro Claude Code.

## Onde estamos (atualizar quando mudar)
- App **Church OS** ("Tally"). Steps do Notion #1–#7 CONCLUÍDOS no app JS puro (Vite) na branch **main**, no ar em tallyapp-jade.vercel.app. Faltam #8–#12.
- **EM CURSO: migração para Next.js + TypeScript** na branch **`refactor/nextjs`** (app em `tally-app/web/`). Playbook: `docs/refactor-nextjs-spec.md`. Inventário/progresso: `.tmp/nextjs/FEATURES-DONE.md` (6/16 telas + **Signals engine concluído**, 64 testes verdes). App JS puro segue intacto na main até o **cut-over** (última fase).
- **Signals engine CONCLUÍDO** (commit `19bf0a5`): `features/signals/domain.ts` puro, 20 testes. Ainda não plugado em tela.
- **Teams CONCLUÍDO** (commit `572d1e9`, 78 testes verdes): `features/teams/` + rotas /teams, /teams/[id], /teams/ministry/[id], /teams/schedule. Sem migração (banco já atendia). `leadershipDev` segue no blob `app_state` com patch cirúrgico; delete de ministério é cascade real (confirmado na UI).
- Próximo na migração: **Services/Cultos** (/services). Banco pronto e verificado — handoff em `docs/handoffs/services-supabase.md`. ⚠️ `attendance_*` é COMPARTILHADA com Groups (já migrado) via `context_type` — reusar o caminho de Groups. Depois: Events→Calendar, Study→Tracks, Care→Inbox→Home, Settings.
- **Pendência de versionamento**: `docs/handoffs/` e `docs/orchestrator-state.md` são meus (orquestrador) e ainda NÃO estão no git — o Claude Code os deixou fora do commit da feature (correto). Pedir ao Claude Code para versioná-los (ele se ofereceu). NÃO commitar pela pasta OneDrive (git dela é inconsistente com o repo real).

## Supabase (minha parte)
- Project: `zzgxeylyrtzsqcdguxql`. Última migração aplicada: **m20**. NÃO recriar banco; preservar RLS.
- Toda tabela operacional tem `org_id` + RLS `is_org_member` (exceção: group_members / attendance_records herdam do pai, sem org_id). Rodar `get_advisors` após DDL.
- **Fixture de teste**: `docs/testing-fixture.md` (usuário + org semeada). Credenciais só em `web/.env.test` (gitignored) — repo é PÚBLICO, nunca commitar segredo.

## Documentos-âncora no repo
- `CLAUDE.md` — contexto do produto, convenções, glossário PT-BR, termos de produto em inglês (Stick/Signal/Care/Journey/Milestone/Pulse/Inbox).
- `docs/design-principles.md` — norte de UI (macOS-grade, simples, isolamento por feature).
- `docs/refactor-nextjs-spec.md` — contrato da migração Next.js.
- `docs/steps/*` — specs dos steps do Notion + notas de fase.
- `.tmp/nextjs/FEATURES-DONE.md` — progresso da migração.

## Regras de ouro
- Repo PÚBLICO: zero segredos no git. service_role nunca no client/repo.
- Verificação: no app novo, `npm run verify` (typecheck+lint+test+build) + integração contra a fixture + e2e. No app legado, teste de paridade/smoke.
- Pendências adiadas de propósito: página pública de inscrição de eventos + pagamento; Sermon Import (upload PDF/docx); interlinear grego/hebraico (STEPBible CC BY 4.0); licenciar versões modernas da Bíblia (só domínio público por ora).
