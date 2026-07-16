# Feature: Trilhas / Discipleship Tracks (/tracks)

Discipulado com caminho claro: trilhas com **etapas ordenadas** e **matrículas** por
Stick, com progresso de **participação** (etapas concluídas), nunca nota (DNA #3).
Portada de `src/views/study.js` + `src/core/tracks-repo.js`. Ver
`docs/handoffs/study-trilhas-supabase.md`.

> Nav "Trilhas" → `/tracks` é a key **`study`**. Não confundir com "Estudo" →
> `/study` (Sermões, key `sermons`, feature separada em `features/study`).

## Arquivos-chave
- `domain.ts` — puro + testes (14): `sortSteps`, `enrollmentPosition` ("N de M" +
  pct), `trackSummary` (card), `planAdvance` (avançar/concluir/noop) e `firstStepId`/
  `nextPosition`. Progresso = `round(idx / total * 100)`, idêntico ao legado.
- `queries.ts` — `loadTracks`: trilhas + etapas (por `position`) + matrículas da org.
- `schema.ts` / `actions.ts` — `createTrackAction` (status "active"), `addStepAction`,
  `enrollAction` (upsert idempotente), `advanceStepAction` (avança/conclui).
- `components/` — `TracksBoard` (biblioteca + modal, Client), `NewTrackModal` (Client),
  `TrackDetail` (Server; forms de Server Action, sem estado de cliente).
- Rotas `/tracks` e `/tracks/[id]`.

## Tabelas Supabase
`tracks`, `track_steps` (`materials` jsonb nasce `[]`), `track_enrollments`
(**UNIQUE (track_id, stick_id)**). Escrita em `milestones` + `timeline_events` na
conclusão. Sem migração (última: m20).

## Paridade — pontos do handoff e decisões
- **`milestones` é COMPARTILHADA** com Journey/Sticks. A conclusão reusa o **mesmo
  caminho/convenção de inserção** do legado (`code "completed_track"`,
  `source_module "tracks"`, `source_record_id` = matrícula), sem via paralela. A
  **Journey NÃO é movida** automaticamente (não há config trilha→journey; não forçar).
  `visibility` (milestone e timeline) tem default no banco — não setamos.
- **Idempotência**: `enroll` é `upsert onConflict:"track_id,stick_id"` — re-matricular
  a mesma pessoa não duplica (reinicia na 1ª etapa, como o legado).
- **Autoridade no servidor**: `enroll`/`advance` recarregam as etapas da trilha no
  servidor (via `track_steps`) para decidir 1ª etapa / próxima etapa — não confiam em
  estado do cliente (o legado decidia a partir do `state` em memória).
- **Sticks arquivadas** são excluídas dos nomes e do select de matrícula (handoff): a
  lista de pessoas vem de `listSticks` (já filtra `archived=false`); matrícula órfã de
  Stick arquivada aparece como "—".
- **Filtro de campus** no select de matrícula via `?campus=` (espelha o `inCampus` do
  legado); default = 1º campus.
- **Material de ensino**: sermões vinculados por `content.track_id` — leitura
  **cross-feature** da Study já migrada (`listSermons`), link para
  `/study/sermon/[id]`. Sem tabela nova (vínculo leve no jsonb).
- **Estado de navegação → rotas**: `state.trackDetail` do blob virou `/tracks/[id]`.

## Mudança de comportamento documentada
- O legado, ao concluir, empurrava um `p.milestones` **em memória** só para a UI da
  Stick. Aqui a fonte é relacional: o milestone gravado em `milestones` é lido pela
  Journey/Timeline — **sem duplicata em memória**. Efeito visível idêntico; a origem
  do dado é a tabela.
