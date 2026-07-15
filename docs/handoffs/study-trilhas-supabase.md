# Handoff Supabase — feature Study / Trilhas (/tracks)

> Orquestrador → Claude Code. Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`,
> 2026-07-14. **Sem migração.** Última migração: **m20**.

## TL;DR
- Tabelas: `tracks`, `track_steps`, `track_enrollments` (+ `milestones`/`milestone_types`,
  compartilhadas — ver abaixo). Todas com `org_id` + RLS `is_org_member(org_id)`.
- `track_enrollments` tem **UNIQUE (track_id, stick_id)** → upsert de matrícula por
  `onConflict:'track_id,stick_id'` (sem duplicar a mesma pessoa na trilha).

## Colunas reais
**tracks**: `id` · `org_id` NOT NULL · `name` NOT NULL · `description` null · `type` text null ·
`status` **text NOT NULL** (texto, não enum — confira valores no legado) · `created_at`.

**track_steps**: `id` · `org_id` NOT NULL · `track_id` uuid NOT NULL · `name` NOT NULL ·
`description` null · `position` **int NOT NULL** (ordem dos passos) ·
`materials` **jsonb NOT NULL** (default `[]`/`{}` — nunca null) · `created_at`.

**track_enrollments**: `id` · `org_id` NOT NULL · `track_id` uuid NOT NULL ·
`stick_id` uuid NOT NULL · `current_step_id` uuid null · `progress` **int NOT NULL** (0–100) ·
`status` text NOT NULL · `started_at` null · `completed_at` null · `created_at` · `updated_at`.

## Cascades
- Apagar **track** → CASCADE em `track_steps` e `track_enrollments`.
- Apagar **step** → `track_enrollments.current_step_id` vira NULL (matrícula sobrevive).
- Apagar **stick** → CASCADE em `track_enrollments` (some a matrícula da pessoa).

## ⚠️ `milestones` é COMPARTILHADA (Journey já migrado)
Trilhas pode marcar um `milestone` ao concluir (ex.: "Concluiu o Discipulado 101"). A tabela
`milestones` **já é usada pela feature Journey (migrada)** e por Sticks. **Reuse o caminho de
milestone que já existe em `features/journey`** — não crie inserção paralela.
- `milestones`: `org_id` · `stick_id` NOT NULL (CASCADE) · `milestone_type_id` (SET NULL) ·
  `code` · `occurred_on` **date NOT NULL** · `title` · `description` · `source_module` ·
  `source_record_id` (aponte para a matrícula/track) · `visibility` text NOT NULL · `created_by`.
- `milestone_types`: catálogo (`code`, `name`, `is_system` bool, `auto` bool) — RLS is_org_member.
  Não recriar tipos de sistema; leia os existentes.

## Sticks arquivadas
Filtrar `sticks.archived` a montante ao listar matriculados.

## Depois de Trilhas
Faltam: **Care** (`docs/handoffs/care-supabase.md`), **Inbox**
(`docs/handoffs/inbox-supabase.md`), **Home** (`docs/handoffs/home-supabase.md`),
**Settings** (`docs/handoffs/settings-supabase.md`) e o **cut-over**
(`docs/handoffs/cutover-checklist.md`). Todos já escritos — leia o de cada uma antes.

— fim.
