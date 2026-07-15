# Handoff Supabase — feature Teams (/teams)

> Escrito pelo orquestrador (dono do Supabase) para o Claude Code (dono do front).
> Fatos abaixo **confirmados via MCP** no projeto `zzgxeylyrtzsqcdguxql` em 2026-07-14.
> **Nenhuma migração é necessária**: as 4 tabelas já existem, com RLS e constraints
> corretas e já semeadas na fixture. É só migrar o front sobre elas.

## TL;DR
- 4 tabelas prontas: `ministries`, `teams`, `team_members`, `schedule_assignments`.
- Todas com `org_id` direto, RLS **ativa**, política única `*_rw` com
  `USING is_org_member(org_id)` **e** `WITH CHECK is_org_member(org_id)` (cobre SELECT/
  INSERT/UPDATE/DELETE). Então toda query/action que já filtra por `org_id` funciona
  como nas features migradas — sem RLS novo para escrever.
- Fixture já tem dados: ministries=3, teams=3, team_members=6, schedule_assignments=3.
- Advisors (security): só os WARN pré-existentes (funções helper SECURITY DEFINER e
  "leaked password protection" no Auth). **Nada novo introduzido**; não bloqueiam Teams.

## Colunas reais (nomes exatos — use estes na `queries.ts`/`schema.ts`)

**ministries**: `id` uuid PK · `org_id` uuid NOT NULL · `campus_id` uuid null ·
`name` text NOT NULL · `description` text null · `leader_id` uuid null · `color` text null ·
`status` text NOT NULL · `created_at` timestamptz NOT NULL.

**teams**: `id` · `org_id` NOT NULL · `ministry_id` uuid null · `campus_id` uuid null ·
`name` NOT NULL · `description` null · `leader_id` uuid null ·
`serving_roles` **jsonb NOT NULL** (os papéis de serviço do time) · `status` text NOT NULL ·
`created_at`.

**team_members**: `id` · `org_id` NOT NULL · `team_id` uuid NOT NULL · `stick_id` uuid NOT NULL ·
`role` text null · `status` text NOT NULL · `availability` text null · `joined_at` **date** null ·
`notes` text null · `created_at`.

**schedule_assignments**: `id` · `org_id` NOT NULL · `service_id` uuid null · `event_id` uuid null ·
`team_id` uuid null · `role` text null · `stick_id` uuid null · `assignment_date` **date** null ·
`status` text NOT NULL · `confirmed_at` timestamptz null · `created_at`.

## Constraints que a lógica do front depende
- **Upsert de membro OK**: existe `team_members_team_id_stick_id_key UNIQUE (team_id, stick_id)`.
  Então `upsert(..., { onConflict: 'team_id,stick_id' })` que o Claude Code planejou
  funciona — a mesma pessoa não duplica no time.
- **`campus` é NOME no app, `campus_id` é uuid na tabela** (FK → `campuses(id)`).
  Resolver nos dois sentidos no hydrate, igual às features já migradas.
- **`leader_id` / `ministries.leader_id` / `teams.leader_id`** → FK para `sticks(id)`
  com `ON DELETE SET NULL`. Líder é a Stick; casa com o `devStage` (líder = `teams.leader_id`).

## Comportamento de DELETE (importante para actions e side-effects)
Confirme estes cascades antes de escrever `deleteTeam`/`deleteMinistry`:
- `team_members.team_id` e `team_members.stick_id` → **ON DELETE CASCADE**.
  ⇒ Apagar um time **já remove os membros automaticamente**. O passo manual
  "deleteTeam apaga team_members antes" é redundante (inofensivo, mas desnecessário).
- `teams.ministry_id` → **ON DELETE CASCADE**. ⇒ Apagar um ministério apaga os times dele
  (e, em cascata, os membros). **Destrutivo** — trate com confirmação clara na UI.
- `schedule_assignments.team_id` → **ON DELETE SET NULL**. ⇒ Apagar um time **não** apaga
  as escalas; elas ficam com `team_id` nulo (órfãs). Decidir se a query as ignora ou mostra.

## Sticks arquivadas
`sticks` **tem** a coluna `archived`. O tipo `Person` migrado não a carrega, então
(como no Signals) **filtre `archived` na query a montante**: ao hidratar membros de time,
junte `sticks` e exclua arquivadas para não listar gente removida.

## O que NÃO preciso fazer (e por quê)
- Não há DDL/migração nova: schema, RLS e constraints já atendem. Última migração
  aplicada segue **m20**.
- Se durante o front aparecer necessidade real de coluna/índice novo, **me avise** (não
  altere schema pelo Claude Code) — eu aplico via migração e rodo advisors.

— fim do handoff. Dúvidas de banco: perguntar ao orquestrador, não improvisar schema.
