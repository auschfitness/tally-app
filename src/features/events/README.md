# Feature: Eventos (/events)

Evento especial (conferência, retiro, curso) — distinto do culto recorrente.
**Inscrição + check-in INTERNOS** (staff logado). Página pública e pagamento online
seguem **ADIADOS**. Migrada do app JS sobre as tabelas relacionais (sem migração de
banco — ver `docs/handoffs/events-supabase.md`). Identifica visitante sem duplicar Stick.

## Arquivos-chave
- `domain.ts` — puro e testável: `whenLabel`, `capacityLabel`, `sortEvents`, e o
  par `tsFrom`/`timeOf` (HH:MM ↔ timestamptz). Portado de `events.js`/`events-repo.js`.
- `queries.ts` — `listEvents`, `eventRegCounts`, `listEventRegistrations`.
- `schema.ts` / `actions.ts` — CRUD de evento + inscrição (`addRegistrationAction`
  com **dedupe no app**), `toggleCheckInAction`, `removeRegistrationAction`.
- `components/` — `EventsBoard`, `EventModal`, `EventTools` (editar + inscrever),
  `RegistrationsList` (check-in/remover). Client só nas folhas.

## Rotas
- `/events` — lista (cards por data desc, filtrada por campus).
- `/events/[id]` — detalhe: inscrições (com check-in) + sobre o evento.

## Tabelas Supabase
`events`, `event_registrations`. `campus_id`↔NOME. **Não usa `attendance_*`** (ver
abaixo).

## Data/hora — fonte da verdade
`event_date` (date) é o **dia**. `start_time`/`end_time` (HH:MM) vêm dos columns
timestamptz `starts_at`/`end_time`: leitura via `timeOf(ts)`, escrita via
`tsFrom(event_date, hhmm)` (`YYYY-MM-DDTHH:MM:00`). Portado 1:1 do repo legado.

## Paridade — pontos do handoff (2 alertas) e mudanças documentadas
- **Alerta 2 — dois check-ins, o legado usa UM.** O legado (`events.js`) marca
  presença de evento **só** via `event_registrations.checked_in` (toggle por
  inscrição). **NÃO** usa `lib/attendance`/`attendance_records` (`context_type='event'`).
  Esta migração replica exatamente isso: check-in de evento = flag na inscrição. A
  presença genérica do Tally (`context_type='event'`) fica disponível para quando/se
  um fluxo futuro precisar — não é usada aqui.
- **Alerta 1 — sem UNIQUE em `event_registrations`.** O banco não impede inscrição
  dupla. Dedupe é **no app**: `addRegistrationAction` checa antes de inserir e recusa
  a mesma Stick 2× no mesmo evento (NÃO usa `upsert onConflict` — não há constraint).
  Visitante anônimo (sem `stick_id`) pode repetir (não há chave). A UI também exclui
  quem já está inscrito do seletor.
- **Excluir evento é CASCADE** (`event_registrations.event_id`) — apaga as inscrições
  junto (o passo manual do legado é redundante). Confirmação clara na UI.
- **Inscrição pública/pagamento ADIADOS**: só inscrição interna (staff). A RLS atual
  (`is_org_member`) não permite anônimo; habilitar isso é ação futura do orquestrador
  (migração de RLS/RPC), não do front.
- **Estado de navegação → rota**: `eventDetail` virou `/events/[id]`.
- `esc()` removido (React escapa); sticks arquivadas excluídas na query.
