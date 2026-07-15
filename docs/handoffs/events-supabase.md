# Handoff Supabase — feature Events / Eventos (/events)

> Escrito pelo orquestrador (dono do Supabase) para o Claude Code (dono do front).
> Fatos **confirmados via MCP** no projeto `zzgxeylyrtzsqcdguxql` em 2026-07-14.
> **Nenhuma migração necessária** para o escopo interno. Última migração: **m20**.

## TL;DR
- Tabelas: `events`, `event_registrations`. Ambas com `org_id` + RLS `is_org_member(org_id)`
  (USING + WITH CHECK). Padrão idêntico às features já migradas.
- Presença de evento reusa `lib/attendance` com `context_type='event'` (módulo já pronto
  de Services/Groups). **MAS leia o alerta 2 abaixo** — há dois conceitos de "check-in".

## ⚠️ Alerta 1 — SEM constraint única em `event_registrations`
Diferente de `team_members` e `attendance_records` (que têm UNIQUE), **`event_registrations`
NÃO tem `UNIQUE (event_id, stick_id)`**. Ou seja, o banco **não** impede a mesma pessoa
de se inscrever duas vezes.
➡️ Se a UI precisar evitar duplicata por Stick, **trate no app** (checar antes de inserir)
— NÃO use `upsert onConflict` aqui (não há constraint pra isso; vai falhar). Se você achar
que o certo é o banco garantir, **me peça** que eu avalio um índice único parcial (só quando
`stick_id` não é nulo — inscrições públicas anônimas não têm stick).

## ⚠️ Alerta 2 — DOIS check-ins distintos (não conflar)
1. `event_registrations.checked_in` (bool) + `checked_in_at` → check-in **da inscrição**
   (a pessoa inscrita chegou). É o fluxo próprio de eventos.
2. `attendance_records` via `lib/attendance` com `context_type='event'` → presença
   **genérica** do Tally (a mesma tabela de Groups/Services).
➡️ Antes de escrever, **confira no legado `src/views/events.js` qual mecanismo ele usa**
para marcar presença de evento, e replique esse. Não crie os dois caminhos se o legado só
usa um. Se usar os dois, documente a diferença no README (como foi feito em Services).

## Colunas reais (nomes exatos)

**events**: `id` · `org_id` NOT NULL · `campus_id` uuid null · `name` NOT NULL ·
`event_date` **date null** · `starts_at` **timestamptz null** · `end_time` timestamptz null ·
`description` null · `type` text null · `cover_image` text null · `location` text null ·
`capacity` int null · `registration_required` **bool NOT NULL** ·
`payment_required` **bool NOT NULL** · `check_in_enabled` **bool NOT NULL** ·
`status` text NOT NULL · `created_by` uuid null · `created_at`.
⚠️ **Data/hora redundantes**: existem `event_date` (date) E `starts_at` (timestamptz).
Confirme no legado qual é a fonte da verdade e escreva coerente (provavelmente `event_date`
para o dia + `starts_at`/`end_time` para horário). Documente a escolha.

**event_registrations**: `id` · `org_id` NOT NULL · `event_id` uuid NOT NULL ·
`stick_id` uuid **null** (inscrição pode ser de não-membro) · `name` text null ·
`email` text null · `phone` text null · `household` text null ·
`answers` **jsonb NOT NULL** (respostas do formulário) · `payment_status` text null ·
`checked_in` **bool NOT NULL** · `checked_in_at` timestamptz null · `created_at`.

## Cascades de DELETE
- `event_registrations.event_id` → **CASCADE**: apagar evento apaga inscrições.
- `event_registrations.stick_id` → **SET NULL**: apagar a Stick preserva a inscrição
  (fica com o nome/e-mail em texto livre). `events.campus_id` → SET NULL.

## Inscrição pública + pagamento = ADIADO (e requer minha ação depois)
O roadmap deixa a **página pública de inscrição + pagamento** para depois. Hoje a RLS de
`event_registrations` só permite **membro da org** (`is_org_member`). Uma inscrição pública
(usuário anônimo/visitante) **não é possível** com a RLS atual — precisaria de uma política
`anon` específica e provavelmente uma RPC controlada. **Não** tente habilitar isso pelo
front; quando essa fase chegar, **eu** crio a migração de RLS. Por ora: inscrição só interna.

## Sticks arquivadas
`sticks.archived` existe; o tipo migrado não o carrega → filtre `archived` na query.

## Depois de Events
`Calendar/Agenda` (/calendar) só **agrega** Services + Events + Teams (já os três migrados
após isto) — sem tabela nova; fazer na sequência. Não precisa de handoff de banco novo,
mas me avise que eu confirmo se há alguma view/RPC de agregação a considerar.

— fim. Dúvidas de banco: perguntar ao orquestrador, não improvisar schema.
