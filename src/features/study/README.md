# Feature: Study / Sermões (/study)

Onde a igreja prepara e preserva o ensino: biblioteca de sermões, editor canvas com
autosave, séries, passagens e notas. A MAIOR feature — migrada em **fatias**, cada uma
com `npm run verify` verde. Ver `docs/handoffs/study-supabase.md`.

> Nav "Estudo" → `/study` é a feature de **Sermões** (key `sermons`). Trilhas é
> separada (key `study` → `/tracks`), com handoff próprio.

## Fatias (todas concluídas)
1. ✅ **Sermões CRUD + editor de content** — biblioteca (filtros status/campus/série),
   editor canvas (título, passagem, ideia central, corpo + seções opcionais) com
   autosave, drawer de Propriedades. Rotas `/study`, `/study/sermon/[id]`.
2. ✅ **Passagens** — parse de referências (PT/EN/abrev, `lib/bible`) →
   `sermon_scriptures` (upsert onConflict), chips detectados no editor, Mapa de
   Escrituras (`/study/map`), painel de texto via **helloao** (mantido como está;
   interlinear ADIADO).
3. ✅ **Séries** — CRUD + workspace (`/study/series/[id]`); vínculo sermão↔série.
4. ✅ **Notas** — `study_notes` (aba `/study/notes`: lista + editor em modal, vínculos
   leves, escopo pessoal/compartilhada, tags).

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
- **Comparar Bíblia (RESTAURADO — Onda 0, item 2):** regressão da migração corrigida.
  `components/BibleCompare.tsx` — modal que busca/lê/compara passagens em versões de
  **domínio público** (helloao, client-side) lado a lado, com toggle PT/EN/ES (default
  = locale do usuário via `profiles.locale`), **Copiar** e **Adicionar ao sermão**.
  Aberto do assistente de Escrituras ("Comparar Bíblia") e por referência ("Comparar").
  O painel de passagem ganhou **"Capítulo inteiro"** (com realce dos versículos-alvo).
  Interlinear grego/hebraico segue ADIADO (módulo grande, à parte).
- **Diferido, documentado (não escondido):** aba **Recursos** (tabela fora do handoff
  das 4 — precisa de handoff próprio do orquestrador); **Buscar** no Estudo (busca de
  conteúdo: sermões/notas/séries) e **Memória de sermão** (sugestões de relacionados)
  entram numa rodada futura; o **select de Trilha** no editor entra com Tracks
  (o `content.track_id` já é preservado). O "você já pregou sobre isto" (histórico por
  passagem) no painel do editor fica para depois; hoje o Mapa de Escrituras já mostra o
  cruzamento livro→sermões.
- `esc()` removido (React escapa); sticks arquivadas excluídas onde listar pessoas.
