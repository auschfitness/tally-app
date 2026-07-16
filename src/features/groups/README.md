# Feature: Saúde dos Grupos (Groups)

Distribuição de saúde, cards por grupo e relatório do grupo (membros, presença,
líder, orações). Saúde derivada de Sticks (careReasons) + `group_members`.

## Arquivos-chave
- `domain.ts` — `Group`, `GroupHealth`, `groupsHealth`, `bandOf`. Depende do domínio
  de Sticks (`careReasons`) — interface limpa entre features.
- `queries.ts` — `listGroups` (grupos + líder de group_members role='leader' +
  contadores novos/saídas ≤30d) e `listGroupSessions` (presença por sessão).
- `schema.ts` + `actions.ts` — criar grupo, definir líder (promove/demove em
  group_members), registrar presença (attendance_sessions + records).
- `components/GroupsBoard.tsx` — donut de saúde + filtro de faixa + cards.
- `components/NewGroupModal.tsx` — novo grupo.
- `components/GroupTools.tsx` — controle de líder + modal de presença (detalhe).
- `groups.module.css` — cards e layout do topo.

## Tabelas Supabase
- `groups`, `group_members` (papel/status/joined_at/left_at), `attendance_sessions`
  + `attendance_records` (context_type='group').

## Rotas
- `/groups` — lista/saúde. `/groups/[id]` — relatório do grupo.

## Paridade — notas
- Líder e associação de grupo vêm de `group_members` (não mais do blob). Definir líder
  promove a Stick a role='leader' e demove o anterior a 'member'.
- Presença de grupo cria uma `attendance_session` (context_type='group') + records.
  Não altera `last_seen_at` (igual ao legado: só o check-in de culto faz isso).
- Eventos de timeline de entrada/saída de grupo entram com a migração da Timeline.
