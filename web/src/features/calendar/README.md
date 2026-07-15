# Feature: Agenda / Calendário (/calendar)

Cultos, eventos e escala num só lugar — **só o que tem data real**. É uma
**AGREGAÇÃO de leitura na camada do app**: NÃO tem tabela/view/RPC própria (confirmado
no handoff). Views Agenda/Semana/Mês, filtro por tipo, campus-aware. Migrada de
`src/views/calendar.js`.

## Arquivos-chave
- `queries.ts` — `loadCalendarSources`: **reusa** `listServices` (Services),
  `listEvents` (Events) e `loadTeamsData` (Teams) e apenas **normaliza**. Não toca
  tabelas direto → herda RLS, filtro de `archived` e resolução de `campus` das fontes.
- `domain.ts` — puro e testável: `occurrences(from, to, sources, campus, filtro)`
  projeta a timeline; recorrência de culto por `weekday` (weekly/monthly; custom não
  entra), eventos por `event_date`, escala por `assignment_date`. + `groupByDay`,
  `periodLabel` e helpers de data. Portado 1:1 do legado.
- `components/CalendarBoard.tsx` — Client (folha): troca de view, filtro e navegação
  em memória (dados vêm prontos do RSC; sem round-trip por clique).
- `types.ts` — `CalItem { date, kind, title, sub, ref }` + projeções das fontes.

## Rota
- `/calendar` — Agenda (próximos 60 dias), Semana e Mês. "abrir" leva à fonte:
  culto → `/services/[id]`, evento → `/events/[id]`, escala → `/teams/schedule`.

## Tabelas Supabase
Nenhuma diretamente. Fontes (via queries de feature): `services` (weekday),
`events` (event_date), `schedule_assignments` (assignment_date, +nomes de time/Stick).

## Paridade — mudanças documentadas
- **Item normalizado**: o legado usava `kind:"schedule"`; aqui é `kind:"assignment"`
  (contrato do handoff). Rótulo "Escala" e link para `/teams/schedule` preservados.
- **Estado de navegação → estado do Client**: `calView`/`calAnchor`/`calTypeFilter`
  do blob viraram `useState` no board (não persistem entre sessões; eram efêmeros).
- **Nomes na escala**: pessoa resolvida via `nameByStick` do domínio Teams, que já
  exclui arquivadas (o legado usava `state.people` cru) — diferença benigna e alinhada
  ao "archived filtrado na fonte".
- **Sem tabela nova**: se a agenda ficar lenta com volume real, o handoff prevê uma
  view `calendar_items` (ação futura do orquestrador). Por ora, agregação no app.
- `esc()` removido (React escapa no render).
