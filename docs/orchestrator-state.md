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
- **Services/Cultos CONCLUÍDO** (commit `1bbcd87`, 88 testes): `features/services/` + /services, /services/[id]. Caminho de presença extraído para `lib/attendance.ts` (fonte única de `attendance_sessions`/`attendance_records`); Groups refatorado para usá-lo; Services usa o mesmo com `context_type='service'`. Events/Teaching futuros reusam.
- **Events/Eventos CONCLUÍDO** (commit `9539bae`, 98 testes): `features/events/` + /events, /events/[id]. Check-in de evento = `event_registrations.checked_in` (legado NÃO usa `lib/attendance`); dedupe de inscrição no app (sem unique no banco); inscrição pública/pagamento seguem ADIADAS. Docs versionados no mesmo commit.
- **Calendar/Agenda CONCLUÍDO** (commit `05992fe`, 108 testes): `features/calendar/` + /calendar. Agregação de leitura no app reusando `listServices`/`listEvents`/`loadTeamsData`; item comum `{date,kind,title,ref}`; views Agenda/Semana/Mês. Sem tabela nova.
- Próximo na migração: **Study/Sermões** (/study) — a MAIOR feature. Handoff `docs/handoffs/study-supabase.md`. ⚠️ visibility não imposta por RLS; service_id/preacher_id sem FK; content jsonb (canvas). Fatiar.

## TODOS OS HANDOFFS RESTANTES JÁ PRONTOS (banco 100% escaneado via MCP)
Escaneei de uma vez todas as tabelas que faltam — nenhuma feature restante precisa de migração
(schema/RLS/constraints já atendem; última migração segue **m20**). Ordem e docs:
1. **Study/Sermões** → `docs/handoffs/study-supabase.md`
2. **Study/Trilhas** → `docs/handoffs/study-trilhas-supabase.md` (⚠️ milestones compartilhada c/ Journey; enrollments UNIQUE p/ upsert)
3. **Care** → `docs/handoffs/care-supabase.md` (⚠️ RLS por permissão `care.view`/`care.manage`; fixture é owner=passa; IDs de pessoa são de auth.users, não sticks)
4. **Inbox** → `docs/handoffs/inbox-supabase.md` (⚠️ decidir fonte: engine ao vivo + signal_overrides vs. tabela signals; overrides UNIQUE p/ upsert)
5. **Home** → `docs/handoffs/home-supabase.md` (agregação pura no app; por último; depende do engine + Care + Inbox)
6. **Settings** → `docs/handoffs/settings-supabase.md` (fonte da verdade por campo: tabela vs. blob; blob = read-modify-write cirúrgico)
7. **Cut-over (Fase 6)** → `docs/handoffs/cutover-checklist.md` (Vercel→web/, Supabase Auth URLs, advisors, aposentar legado)
Ações que ficaram explicitamente PARA MIM (orquestrador), sob pedido: inscrição pública/pagamento (RLS anon), confidencialidade real de Care, FKs de sermons, enforcement de visibility, restringir edição de org a owner, usuário de teste não-owner p/ Care.

## Decisão registrada (Care, quando o Claude Code chegou nele)
- Care migrado COMO OWNER (happy path completo e testável; fixture é owner → passa `care.view`/`care.manage`). Caminho negativo ("sem permissão → não vê nada") = teste ADIADO, documentado no README do Care.
- **Pendência minha+dono**: prover usuário de teste NÃO-owner. Requer credencial extra em `web/.env.test` (fora do git, na máquina do dono) + eu semeio o membership sem `care.view`. Fazer quando quisermos fechar o teste negativo — NÃO bloqueia nada.
- **Docs de orquestração JÁ versionados** (commit `b99e0c3`): `docs/orchestrator-state.md` + `docs/handoffs/*`. Handoff agora vive no git. (Continuar: NÃO commitar pela pasta OneDrive — git dela é inconsistente com o repo real; commits saem do lado do Claude Code.)
- **Lacuna herdada conhecida**: check-in não atualiza `last_seen`/`followup` da Stick (veio da migração de Groups; documentado nos READMEs). Revisitar quando fizer sentido para Care/Home.

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
