# Relatório — migrate(sticks): app_state → tabela relacional `sticks`

## O que mudou
As pessoas (Sticks) passam a ser **lidas e gravadas na tabela `sticks`** do Supabase,
em vez de viverem dentro do blob `app_state`. Os sub-campos que são de outras
entidades (**grupo, milestones, household, journeyStage**) continuam no `app_state`
por ora, casados por `id` — cada migração futura tira um deles de lá.

## Arquivos tocados
- **NOVO** `src/core/sticks-repo.js`: `hydratePeople()` (carrega da tabela + mescla sub-campos do app_state + backfill de orgs antigas), `upsertStick()` (insert/update, resolve campus nome→id, cria campus se faltar), `archiveStick()` (soft delete). SELECT sem filtro de org (RLS); INSERT/UPSERT com `org_id: ORG_ID`.
- `src/core/supabase.js` (`loadOrg`): chama `hydratePeople(state)` depois de carregar o app_state (nos dois caminhos) antes de renderizar.
- `src/views/sticks.js`: `personModal` novo→`upsertStick` (adota o **uuid** retornado como id da pessoa), editar→`upsertStick`, arquivar→`archiveStick`; check-in→`upsertStick`.
- `src/core/events.js`: "Marquei presença" (`data-seen`)→`upsertStick`.

## Mapa de campos (people[] → sticks)
name→full_name · relationship→relationship_status (enum 1:1) · roles[leader]→is_leader ·
campus(nome)→primary_campus_id · lastSeen→last_seen_at · followup→followup_open ·
firstVisit→first_visit_date · source→source · birthDate→birth_date · (arquivar)→archived.
**Fora deste passo (seguem no app_state):** group, milestones[], household, journeyStage.

## Resultado da verificação
- `/verify-app`: **verde** — paridade 10/10 telas idênticas, 11/11 modais, build OK.
- Banco (via MCP):
  - Leitura: as 10 Sticks da org demo mapeiam certo (relação, campus, jornada pos 1–6 → código).
  - Escrita (colunas/enum): insert com `org_id` + `relationship_status` aceito, devolve uuid.
  - RLS: política `org_all` (ALL, role authenticated, WITH CHECK `is_org_member(org_id)`). `is_org_member` = true na própria org, false em outra (isolamento).
  - Insert real sob RLS (role `authenticated`, impersonando o membro) **passou** e foi revertido (rollback) — 0 lixo no banco.

## Cuidados aplicados (aprovados)
1. RLS × org_id: select sem filtro de org; insert/upsert com `org_id = ORG_ID` explícito (coluna NOT NULL sem default).
2. Reconciliação de id: o `id` da pessoa passa a ser o **uuid do banco** (retornado no insert) — mantém grupo/milestones/household (no app_state) apontando certo.
3. Enum: `relationship_status` confere 1:1 com o app (fallback seguro no `relOr`, nunca inventa valor).

## Decisões / follow-ups
- **journeyStage ficou no app_state:** a org de teste ("hui") não tem `journey_stages` semeados (o `create_org` não cria). Como jornada é outra entidade, não forcei `journey_stage_id`. **Follow-up:** o `create_org` deveria semear os 6 `journey_stages` padrão em orgs novas — resolver na migração da entidade `journey`.
- `hydratePeople` faz **backfill** de orgs que ainda tinham pessoas no app_state (sobe pra tabela, adota os uuids). Para a org demo (só relacional), carrega as 10 da tabela; grupo/milestones/household ficam vazios até suas migrações.
- Conferência final opcional (dono): logar no app, criar uma pessoa, F5, confirmar que persiste e o Console fica limpo.

## Próxima entidade
`groups` (+ `group_members`) — inclui o vínculo pessoa↔grupo que hoje é o campo `group` (nome) na Stick.
