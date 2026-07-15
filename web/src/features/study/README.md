# Feature: Study / Sermões (/study)

Onde a igreja prepara e preserva o ensino: biblioteca de sermões, editor canvas com
autosave, séries, passagens e notas. A MAIOR feature — migrada em **fatias**, cada uma
com `npm run verify` verde. Ver `docs/handoffs/study-supabase.md`.

> Nav "Estudo" → `/study` é a feature de **Sermões** (key `sermons`). Trilhas é
> separada (key `study` → `/tracks`), com handoff próprio.

## Fatias
1. ✅ **Sermões CRUD + editor de content** — biblioteca (filtros status/campus/série),
   editor canvas (título, passagem, ideia central, corpo + seções opcionais) com
   autosave, drawer de Propriedades. Rotas `/study`, `/study/sermon/[id]`.
2. ⏳ **Passagens** — parse de referências (PT/EN/abrev) → `sermon_scriptures`
   (upsert), chips detectados, Mapa de Escrituras, painel helloao (mantido como está;
   interlinear ADIADO).
3. ⏳ **Séries** — CRUD + workspace da série.
4. ⏳ **Notas** — `study_notes` (lista + editor).

## Arquivos-chave (fatia 1)
- `domain.ts` — rótulos/faixas, `SECTIONS` (glossário PT-BR fixado), `filterSermons`,
  `sortSermonsByDate`. Puro + testes.
- `queries.ts` — `listSermons`, `listSeries`. `campus_id`→NOME; `content` jsonb
  preservado 1:1 (nunca null); `service_id`/`preacher_id` sem FK → defensivo.
- `schema.ts` / `actions.ts` — `saveSermonAction` (create/update = autosave; seta
  `updated_at`), `deleteSermonAction`.
- `components/` — `SermonLibrary` (filtros + cards agrupados por série), `SermonEditor`
  (canvas + autosave debounce 900ms + drawer). Client só nas folhas.

## Tabelas Supabase
`sermons` (+ `content` jsonb), `series` (leitura na fatia 1; CRUD na fatia 3).
`sermon_scriptures` e `study_notes` entram nas fatias 2 e 4.

## Paridade — pontos do handoff e decisões
- **⚠️ `visibility` é RÓTULO DE APP, não segurança.** A RLS só filtra por org
  (`is_org_member`): qualquer membro lê TODOS os sermões, independente de
  private/leadership/church/public. NÃO é regra de acesso (difere de Care/orações
  privadas). Se "private" tiver que esconder de verdade, é migração de RLS do
  orquestrador — hoje é só metadado de exibição.
- **`content` jsonb** preservado 1:1: o editor grava as 5 seções (outline/notes/
  illustrations/application/prayer_response) + sub-campos extras do blob (ex.:
  `track_id`) sem reformatar; novo sermão nasce com `content` objeto, nunca null.
- **Autosave** = update de uma linha (`content` + `updated_at`), sem trigger; o editor
  adota o id do banco no 1º save de um sermão novo (URL shallow, sem remount).
- **Excluir sermão**: `sermon_scriptures` CASCADE (passagens somem); `study_notes.
  sermon_id` SET NULL (a nota sobrevive).
- **Estado de navegação → rotas**: `sermonEdit`/`seriesDetail`/`scriptureMap` do blob
  viram rotas (`/study/sermon/[id]`, e nas próximas fatias `/study/series/[id]`,
  `/study/map`).
- **Trilha (material de ensino)** no editor: o select de Trilha fica para quando
  **Tracks** migrar; o `content.track_id` já é preservado no jsonb.
- Abas **Recursos/Buscar** e o **Comparar Bíblia** do legado não estão nesta fatia:
  Recursos usa tabela fora do handoff (precisa de handoff próprio); Buscar/Comparar são
  derivados e entram depois. Nada disso é escondido — está registrado aqui.
- `esc()` removido (React escapa); sticks arquivadas excluídas onde listar pessoas.
