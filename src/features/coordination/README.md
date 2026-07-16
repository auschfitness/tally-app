# Feature: Coordenação (Coordination)

Quadro de avisos e tarefas das equipes. **Migrada do blob `app_state` para as
tabelas relacionais** `coordination_posts` / `coordination_tasks` (que já existiam
vazias) — exemplo do movimento blob → relacional que o resto das features segue.

## Arquivos-chave
- `types.ts` — `Post`, `Task`.
- `queries.ts` — `listPosts`, `listTasks`.
- `schema.ts` + `actions.ts` — criar aviso, criar tarefa, marcar/desmarcar, excluir.
- `components/CoordBoard.tsx` — board + modais de aviso/tarefa (Client).
- `coord.module.css`.

## Tabelas Supabase
- `coordination_posts` (title, body, team, posted_on), `coordination_tasks`
  (text, assignee, done).

## Rota
- `/coordination`.

## Paridade — nota
- Antes vivia só no `app_state`; agora persiste nas tabelas. Responsáveis de tarefa =
  usuário + líderes do campus (como no legado). O "ping no Inbox" ao designar entra
  quando Inbox/Signals migrar.
