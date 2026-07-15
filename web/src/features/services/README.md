# Feature: Cultos / Serviços (/services)

Um **Service** é um culto recorrente (Domingo 9h, Quarta de oração). Cada
**ocorrência** de presença é uma `attendance_sessions` (context_type=`service`).
Migrada do app JS para Next.js sobre as tabelas relacionais (sem migração de banco —
ver `docs/handoffs/services-supabase.md`). Vazio honesto, nada de planilha.

## Arquivos-chave
- `domain.ts` — puro e testável: `whenLabel`, `sortServices`, `composition`
  (total/visitantes/1ª/retorno/crianças), `trendBars`. Portado de `src/views/services.js`.
- `queries.ts` — `listServices`, `serviceOccurrenceCounts`, `listPlanItems`,
  `listServiceSermons` (só leitura), `listServiceAssignments` (times escalados).
- `schema.ts` / `actions.ts` — CRUD de culto e da ordem do culto (com reordenação
  ↑/↓) + `recordServiceAttendanceAction`.
- `components/` — `ServicesBoard`, `ServiceModal`, `ServiceTools` (editar + check-in),
  `PlanPanel` (ordem do culto + modal de item). Client só nas folhas.
- `services.module.css` — grid de cards e as barras de tendência (sem Chart.js).

## Rotas
- `/services` — lista de cultos (ordenada por dia/horário).
- `/services/[id]` — detalhe: tendência + composição, presenças recentes, ordem do
  culto, sobre, e conexões (sermões + times escalados).

## Presença COMPARTILHADA (crítico)
`attendance_sessions`/`attendance_records` são as MESMAS de Groups. O caminho vive em
**`lib/attendance.ts`** (`listAttendanceSessions`, `recordAttendance`, `ensureCampusId`)
e é usado por Groups (`context_type='group'`) **e** Services (`context_type='service'`).
Não há segundo caminho divergente — Groups foi refatorado para usar o compartilhado
nesta mesma mudança. Enums fixos: context `service|group|event|teaching`, status
`present|absent|excused|unknown`. Upsert/inserção de presença = `present`,
`source='checkin'`.

## Tabelas Supabase
`services` (`active` boolean, `weekday` 0–6), `service_plan_items` (`position` int;
template = `service_id` set, `session_id` null), `attendance_sessions`/
`attendance_records` (via `lib/attendance`). Leitura de `sermons` e
`schedule_assignments` (conexões). `campus_id`↔NOME.

## Paridade — mudanças documentadas
- **Estado de navegação → rota**: `serviceDetail` do legado virou `/services/[id]`.
- **Excluir culto é CASCADE**: `service_plan_items.service_id` e
  `schedule_assignments.service_id` são `ON DELETE CASCADE` — apagar o culto apaga a
  liturgia e as escalas dele. As presenças (`attendance_sessions.context_id`, sem FK)
  ficam, mas sem vínculo. A confirmação diz isso.
- **Check-in não atualiza `last_seen`/`followup`** da Stick. O modal legado
  (compartilhado com Groups) marcava presença **e** carimbava `lastSeen`/`followup=false`;
  a migração de Groups já não fazia isso, e Services segue o MESMO caminho compartilhado
  para não divergir. É uma lacuna herdada de Groups (a registrar como melhoria futura),
  não uma decisão nova desta feature.
- **Ensino deste culto**: sermões aparecem só leitura; a navegação até o editor do
  sermão entra quando **Study** migrar. Times escalados vêm de `schedule_assignments`
  (Teams, já migrado) — dado real.
- **`esc()` removido** (React escapa no render); sticks arquivadas excluídas na query.
