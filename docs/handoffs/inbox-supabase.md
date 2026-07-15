# Handoff Supabase — feature Inbox (/inbox)

> Orquestrador → Claude Code. Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`,
> 2026-07-14. **Sem migração.** Última migração: **m20**.
> Depende do **Signals engine** (já concluído).

## ⚠️ Decisão de fonte da verdade — engine vs. tabela `signals`
Existem DUAS coisas com o nome "signal":
1. O **engine** `features/signals/domain.ts` (já pronto) que **calcula** signals ao vivo a
   partir de pessoas/grupos/tarefas/cultos/eventos + aplica `activeSignals(overrides)`.
2. A **tabela `signals`** (persistida) no banco.
No app legado (blob), o Inbox era **calculado ao vivo** pelo `derived.js` + `signalOverrides`
do blob — a tabela `signals` **provavelmente não era a fonte**.
➡️ **Antes de escrever**, confirme no legado `src/views/inbox.js` + `derived.js` se o Inbox
lê do cálculo (engine) ou da tabela. Minha leitura: **Inbox = saída do engine + `signal_overrides`**
(status por `signal_key`), e a tabela `signals` fica reservada para persistência futura. Não
misture as duas fontes sem confirmar — se você concluir que a tabela deve ser a fonte, me avise
que eu reviso RLS/índices e a estratégia de escrita.

## `signal_overrides` (o que o Inbox realmente escreve hoje)
- Colunas: `id` · `org_id` NOT NULL · `signal_key` **text NOT NULL** (a chave estável do
  signal calculado) · `status` **text NOT NULL** (ex.: seen/dismissed) · `updated_at`.
- **UNIQUE (org_id, signal_key)** → upsert por `onConflict:'org_id,signal_key'` (é assim que
  "marcar como visto/dispensar" persiste sem duplicar). RLS `is_org_member(org_id)`.
- Bate 1:1 com `activeSignals`/`sigStatus` do engine (o override casa pela `signal_key`).

## Tabela `signals` (para referência, caso confirme que é usada)
`id` · `org_id` NOT NULL · `campus_id` (SET NULL) · `type` NOT NULL · `category` NOT NULL ·
`title` NOT NULL · `description` · `source_module` · `source_record_id` ·
`related_stick_id` (CASCADE) · `related_group_id` (SET NULL) · `priority` enum NOT NULL ·
`status` enum NOT NULL · `assigned_to` (auth.users) · `detected_at` NOT NULL · `resolved_at` ·
`resolved_by` (auth.users) · `resolution_note` · `dismissed_reason` · `metadata` **jsonb NOT NULL** ·
`created_at`. RLS `is_org_member(org_id)`.
- Enums: `signal_priority` = **celebration, notice, attention, urgent**;
  `signal_status` = **new, seen, assigned, in_progress, resolved, dismissed**.

## Ligação com Care
"Criar Care a partir de um Signal" grava `care_items.signal_id`. Se o Inbox for engine-derived
(sem linha em `signals`), decida o que vai em `care_items.signal_id` (pode ficar null e guardar
a `signal_key`/contexto no item) — **documente a escolha no README**. Se precisar persistir o
signal para ter um `signal_id` real, me chame.

— fim.
