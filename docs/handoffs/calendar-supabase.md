# Handoff Supabase — feature Calendar / Agenda (/calendar)

> Escrito pelo orquestrador (dono do Supabase) para o Claude Code (dono do front).
> Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`, 2026-07-14.

## Veredito: NÃO há nada novo de banco. Agregar no app.
Confirmei via MCP:
- **Nenhuma view** no schema `public`.
- **Nenhuma RPC de agregação** — só as 5 funções auxiliares de RLS
  (`create_org`, `has_perm`, `is_org_member`, `org_has_no_members`, `shares_org`).

Ou seja, **não existe** (nem eu vou criar agora) uma view/função "calendar" que junte
tudo no banco. Calendar é uma **agregação de leitura na camada do app**: reúna o que as
três features já migradas retornam e projete numa timeline por data.

## Fontes a combinar (todas já migradas — reuse as queries existentes)
- **Services/Cultos** → `features/services/queries` (campo de data: `services.weekday`
  para recorrência; sessões via `attendance_sessions.session_date`).
- **Events/Eventos** → `features/events/queries` (data: `events.event_date` +
  `starts_at`/`end_time`).
- **Teams/Escala** → `schedule_assignments.assignment_date` (via `features/teams`).

➡️ **Não reimplemente** essas leituras nem vá direto às tabelas — chame/reuse as queries
de feature já existentes e apenas normalize num tipo comum de item de agenda
(`{ date, kind: 'service'|'event'|'assignment', title, ref }`) para render. Isso mantém
RLS, filtros de `archived` e resolução de `campus` já corretos nas fontes.

## Recomendação (custo/benefício)
Fazer a agregação no app é o certo agora: as fontes são pequenas por org e já vêm
filtradas por RLS. Uma view SQL só valeria a pena se a agenda ficar lenta com volume real
— o que não é o caso hoje. **Se um dia precisar** (paginação por mês no servidor, muitos
registros), me peça: eu avalio uma view `calendar_items` com RLS por `org_id`. Por ora,
camada de app.

## Sem migração
Última migração segue **m20**. Nada a aplicar para Calendar.

## Depois de Calendar
Próximas fontes que ainda faltam escanear: **Study/Sermões** (`sermons` e afins) e
**Study/Trilhas** (`tracks`, `track_steps`, `track_enrollments`, `milestones`). Peça o
handoff de cada uma quando chegar — Study/Sermões é a maior feature (editor canvas),
vale um escaneamento cuidadoso das tabelas dela.

— fim.
