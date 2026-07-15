# Handoff Supabase — feature Services / Cultos (/services)

> Escrito pelo orquestrador (dono do Supabase) para o Claude Code (dono do front).
> Fatos **confirmados via MCP** no projeto `zzgxeylyrtzsqcdguxql` em 2026-07-14.
> **Nenhuma migração é necessária**: as 4 tabelas já existem, com RLS, enums e
> constraints corretas. Migrar o front sobre elas.

## TL;DR
- Tabelas: `services`, `service_plan_items` (ordem do culto/liturgia),
  `attendance_sessions`, `attendance_records`.
- RLS **ativa** em todas. `services` / `service_plan_items` / `attendance_sessions`:
  política com `is_org_member(org_id)` (USING + WITH CHECK).
  `attendance_records` **não tem `org_id`** — é isolada pelo pai: política
  `attrec_all` exige que a `attendance_sessions` referenciada seja visível
  (transitivamente = mesma org). Comportamento igual ao de Groups.
- Última migração aplicada: **m20**. Não altere schema; se faltar algo, me avise.

## ⚠️ Ponto crítico: `attendance_*` é COMPARTILHADA com Groups (já migrado)
`attendance_sessions.context_type` é um enum que separa os usos:
`service | group | event | teaching`. A feature **Groups já migrada** lê/escreve
`attendance_sessions`/`attendance_records` com `context_type='group'`. Services usa as
MESMAS tabelas com `context_type='service'`.
➡️ **Antes de escrever queries de presença, leia as queries de attendance já feitas em
`features/groups/`** e reuse o mesmo shape (hidratação, upsert de record) filtrando por
`context_type`. Não crie um segundo caminho divergente para a mesma tabela.

## Enums (valores EXATOS — são enums Postgres, não texto livre)
- `attendance_context` (coluna `attendance_sessions.context_type`):
  **`service`, `group`, `event`, `teaching`**.
- `attendance_status` (coluna `attendance_records.status`):
  **`present`, `absent`, `excused`, `unknown`**.
Usar strings fora dessas listas → erro de insert.

## Colunas reais (nomes exatos)

**services**: `id` · `org_id` NOT NULL · `campus_id` uuid null · `name` NOT NULL ·
`weekday` int null (0–6) · `start_time` text null · `end_time` text null ·
`description` text null · `type` text null · `recurring_pattern` text null ·
`location` text null · `active` **boolean NOT NULL** · `created_at`.

**service_plan_items** (itens da liturgia): `id` · `org_id` NOT NULL ·
`service_id` uuid null · `session_id` uuid null (liga a um culto recorrente OU a uma
sessão específica) · `position` **int NOT NULL** (ordem) · `time_label` text null ·
`title` text NOT NULL · `duration_min` int null · `responsible` text null ·
`notes` text null · `created_at`.

**attendance_sessions**: `id` · `org_id` NOT NULL · `context_type` enum NOT NULL ·
`context_id` uuid null (id do service/group/event conforme o tipo) · `campus_id` null ·
`title` text null · `session_date` **date NOT NULL** · `session_time` text null ·
`photo` text null · `created_by` uuid null · `created_at`.

**attendance_records**: `id` · `session_id` uuid NOT NULL · `stick_id` uuid NOT NULL ·
`status` enum NOT NULL · `recorded_at` timestamptz NOT NULL · `recorded_by` uuid null ·
`source` text NOT NULL. **(sem `org_id` — herda do pai)**

## Constraints que a lógica depende
- `attendance_records` tem `UNIQUE (session_id, stick_id)` → upsert de presença por
  `onConflict: 'session_id,stick_id'` (uma marcação por pessoa por sessão). Mesmo
  padrão já usado em Groups.
- `campus` é NOME no app ↔ `campus_id` uuid (FK → `campuses`). Resolver nos dois sentidos.

## Cascades de DELETE (para as actions)
- `service_plan_items.service_id` → **CASCADE**: apagar um culto apaga sua liturgia.
- `schedule_assignments.service_id` → **CASCADE** (visto no handoff de Teams): apagar um
  culto apaga as escalas ligadas a ele. **Destrutivo** — confirmar na UI.
- `attendance_records.session_id` → **CASCADE**: apagar a sessão apaga as marcações.
- `service_plan_items.session_id` → **CASCADE**: idem.
- `attendance_sessions.campus_id` / `services.campus_id` → **SET NULL**.

## Sticks arquivadas
Como sempre: `sticks.archived` existe mas o tipo migrado não o carrega. Ao listar
presença/pessoas, **filtre `archived` na query a montante**.

## Depois de Services
`Calendar/Agenda` só agrega Services + Events + Teams — fazer **depois** de Events.
Events é a próxima fonte que ainda falta escanear; me peça o handoff quando chegar lá.

— fim. Dúvidas de banco: perguntar ao orquestrador, não improvisar schema.
