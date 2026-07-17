# Feature: Serviço — Times & Ministérios (/teams)

**Team = onde a pessoa SERVE** (≠ Group, onde ela pertence). Ministério agrupa
Times. Consciência operacional, **nunca RH/nota/score** (DNA #3). Migrada do app JS
para Next.js sobre as tabelas relacionais (nenhuma migração de banco — ver
`docs/handoffs/teams-supabase.md`).

## Arquivos-chave
- `domain.ts` — puro e testável (`now` injetado): `teamHealth` (observações),
  `roleDistribution`, `statusCounts`, `leadershipLadder`, `ministryStats`,
  `devStage`, ciclo/rotulos de escala e helpers de semana. Portado 1:1 de
  `src/views/teams.js`.
- `queries.ts` — `loadTeamsData`: ministries/teams/team_members/schedule + nomes de
  sticks (só **não arquivadas**) + `leadershipDev` do blob. Resolve `campus_id`→nome.
- `schema.ts` — validação de entrada dos 4 formulários (ministério/time/membro/escala).
- `actions.ts` — Server Actions (CRUD + líder + status de escala). Side-effects em
  `timeline_events` (team_joined "Começou a servir", team_leader_set "Passou a liderar").
- `components/` — `TeamsBoard` (lista), `TeamModal`/`MinistryModal` (criar/editar),
  `TeamMembersPanel` (quem serve + modal de papel), `EditButtons`, `ScheduleClient`
  (escalar + status/remover). Client só nas folhas; o resto é RSC.
- `teams.module.css` — grid de cards, escada e o ponto de saúde.

## Rotas
- `/teams` — lista (ministérios → times, + times sem ministério).
- `/teams/[id]` — detalhe do time (membros, papéis, distribuição, saúde, liderança).
- `/teams/ministry/[id]` — painel do ministério.
- `/teams/schedule?anchor=YYYY-MM-DD` — board semanal de escala.

## Tabelas Supabase
`ministries`, `teams` (`serving_roles` jsonb), `team_members` (UNIQUE team_id+stick_id;
`joined_at` date), `schedule_assignments` (`assignment_date` date). Todas com `org_id`
direto e RLS `*_rw` via `is_org_member`. Escreve `timeline_events`. Lê/patcha o
sub-campo `leadershipDev` do blob `app_state`.

## Estado migrado (navegação → rotas)
O legado guardava `teamDetail`/`ministryDetail`/`scheduleView`/`scheduleAnchor` no
estado global; aqui viraram **rotas** e o `?anchor=` da escala é renderizado no
servidor (semana por URL, compartilhável).

## Paridade — mudanças documentadas
- **`leadershipDev` (Aprendiz/Co-líder) segue no blob `app_state`.** Não há coluna
  relacional (handoff confirma o schema em m20). A action faz um **patch cirúrgico**
  de `data.leadershipDev` preservando os outros sub-campos do blob; `"serving"`
  (default) apaga a chave. "Líder" vem sempre de `teams.leader_id`.
- **Excluir ministério é destrutivo de verdade.** No JS legado o `deleteMinistry`
  só zerava `ministry_id` na memória local, mas a FK real é
  `teams.ministry_id ON DELETE CASCADE`: o banco **apaga os times do ministério** (e,
  em cascata, os membros). O legado tinha esse descompasso (memória ≠ banco até
  recarregar). Aqui a confirmação diz a verdade e a UI reflete o cascade.
- **Excluir time**: `team_members ON DELETE CASCADE` remove os vínculos
  automaticamente (o passo manual do legado era redundante). `schedule_assignments.
  team_id ON DELETE SET NULL` deixa escalas órfãs → o board mostra "Time removido".
- **`esc()` removido** dos títulos/labels: o React escapa no render (sem HTML no
  domínio/dados).
- **Sticks arquivadas** são excluídas na query (o tipo migrado não carrega
  `archived`), como no Signals.
- Escala ainda é **por data** (`service_id`/`event_id` ficam nulos): Serviços/Eventos
  chegam nas próximas features; o gancho já está pronto no schema.
- **"Hoje" da Escala vem do fuso da organização** (`app_state.account.timezone`, via
  `zonedTodayIso`), não do relógio do servidor. O SSR roda em UTC na Vercel, então usar
  a data do servidor destacava o dia SEGUINTE à noite no Brasil/EUA (off-by-one). Sem
  `?anchor=`, a semana padrão parte desse "hoje" corrigido.

## Consumidores
Os Signals de Teams já existem em `features/signals` (serviceSignals consome
teams/teamMembers/schedule) — a UI de Inbox/Home passa a receber esses dados quando
migrar.
