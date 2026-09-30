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
- **Estudo do Texto (hub — Estudo Bíblico Fase 1):** `components/BibleCompare.tsx` foi
  reposicionado de "Comparar Bíblia" para o hub **"Estudo do Texto"** — a passagem é a
  estrela; comparar traduções vira **uma lente**. Cabeçalho com a referência + abas de
  revelação progressiva: **Traduções** (ativa) · Original · Palavras-chave · Contexto ·
  **Referências** (ligada — cross-refs TSK) · Notas (Original/Palavras-chave/Contexto/
  Notas são placeholders "Em breve" até o dado chegar do orquestrador — STEPBible). Idioma vem só da conta (`profiles.locale` via prop
  `locale`; sem toggle en/es/pt). Lista de versões **curada** por idioma (domínio
  público) + "Mais versões". Novidades da Fase 1: **favoritar versões** (★, pré-
  selecionadas ao abrir — `localStorage` `tally.bible.favVersions`), **histórico** de
  textos recentes (`tally.bible.history`) e **destaque de diferenças** entre versões
  (diff por versículo no cliente, palavras divergentes realçadas; toggle). Mantidos:
  comparar lado a lado, **Copiar**, **Adicionar ao sermão** (por versão e ação primária
  no topo) e **"Capítulo inteiro"**. Arquitetura **agnóstica de tradução** (só domínio
  público; nada de texto protegido no repo; uma API licenciada futura entra no mesmo
  ponto). Aberto do assistente ("Estudo do Texto") e por referência ("Estudar texto").
  Fases 2+ (contexto) têm handoffs próprios.
- **Aba Original — texto grego/hebraico (Fase 2):** ligada às tabelas GLOBAIS
  `bible_original_tokens` + `strongs_lexicon` (m34, leitura livre, STEPBible CC BY 4.0).
  Ao abrir a passagem, busca os tokens por `book(OSIS)/chapter/verse` (ordena por
  `verse,position`) e o léxico dos Strong presentes; renderiza o versículo palavra a
  palavra. Tocar numa palavra abre um card com surface/translit/lema/Strong/significado
  + **morfologia decodificada** (`lib/bible/morph.ts`, puro + teste; ex.: `V-AAI-3S` →
  "Verbo · Aoristo · Ativa · Indicativo · 3ª pessoa · singular"; cai no código cru se não
  reconhecer). Hebraico renderiza **RTL**. Estado vazio elegante até a carga; crédito
  "Dados originais © STEPBible.org, CC BY 4.0". Loader `scripts/seed-original-text.mjs`
  (carga do dono, precisa service key). Mesmo padrão de fetch da aba Referências
  (dedupe via `useRef`, deps `[tab, ref]`).
- **Aba Palavras-chave (Fase 2):** reusa os tokens da aba Original (mesma passagem/OSIS).
  Descarta palavras funcionais (artigo/partícula/conjunção/preposição) por morfologia
  (`isFunctionWord` em `lib/bible/morph.ts`; hebraico olha a última sub-palavra do
  composto), agrupa por Strong e ordena por relevância — **raras primeiro** (`strong_
  frequency.occurrences`; freq. desconhecida no fim). Lógica pura+testada em
  `lib/bible/keywords.ts` (`buildKeywords`). Cada palavra-chave abre "ver ocorrências"
  (query `bible_original_tokens` por `strong`, top ~40 versículos) como chips que abrem
  a passagem via `openRelated`. Crédito STEPBible CC BY. `strong_frequency` (strong/lang/
  occurrences) entrou nos tipos nesta fatia (regen).
- **Aba Contexto (Fase 3):** cartão editorial por LIVRO, de `bible_book_context` (m36,
  GLOBAL, leitura livre; 66 livros semeados pelo orquestrador na voz do Tally). Busca 1
  linha por `usfmToOsis(ref.book)` (`maybeSingle`), só refaz quando o livro muda (dedupe
  por `useRef`). Card calmo (design-principles): eyebrow AT/NT + `title_pt`; `theme` em
  destaque (azul); `summary` como corpo; `author`/`date_range`/`audience` como metadados
  (Autoria/Época/Público). Sem crédito externo (conteúdo editorial do Tally). Tipos
  regenerados (bible_book_context).
- **Aba Notas (Fase 3):** anotações de estudo ancoradas à passagem, em `study_text_notes`
  (m37, **privadas por autor** via RLS: select/update/delete = `author_id = auth.uid()`).
  CRUD por **Server Actions** (`listTextNotesAction`/`saveTextNoteAction`/
  `deleteTextNoteAction`, `requireOrg` → `org_id` no insert; `author_id` sai do default).
  Aba: textarea + "Guardar nota" (cria, ancorada a `verse_start`/`verse_end` ou só
  capítulo); lista por livro+capítulo (`updated_at` desc); editar em linha + excluir
  (confirmação **inline** "Sim/Não" — sem `window.confirm` nativo, por design-principles);
  **otimista com rollback** em rede ruim. Estado sem sessão ("Entre para
  guardar notas") e estado vazio elegante. RLS já filtra por autor — sem UI de
  compartilhamento. Tipos regenerados (study_text_notes). O hub agora tem as 6 lentes.
- **Aba Referências — cross-refs TSK (Fase 1b):** ligada à tabela GLOBAL
  `cross_references` (m33, leitura livre, sem org_id) via cliente do navegador. Ao abrir
  uma passagem, consulta por `from_book/from_chapter/from_verse` (versículos em foco),
  ordena por `votes` desc e mostra o top ~12 como chips "Textos relacionados" que abrem
  o destino no próprio hub. Mapeamento de códigos openbible **OSIS**↔**USFM** do app em
  `lib/bible/osis.ts`; agregação pura (dedupe por destino, max votes) em
  `lib/bible/crossref.ts` (com teste). Estado vazio elegante + crédito CC BY a
  openbible.info/TSK no rodapé. **Carga do dataset** (~340k linhas) é passo separado do
  dono: `node scripts/seed-cross-references.mjs ./cross_references.txt` com
  `SUPABASE_SERVICE_ROLE_KEY` (não vai ao repo). Enquanto a tabela estiver vazia, a aba
  mostra o estado vazio.
- **Diferido, documentado (não escondido):** aba **Recursos** (tabela fora do handoff
  das 4 — precisa de handoff próprio do orquestrador); **Buscar** no Estudo (busca de
  conteúdo: sermões/notas/séries) e **Memória de sermão** (sugestões de relacionados)
  entram numa rodada futura; o **select de Trilha** no editor entra com Tracks
  (o `content.track_id` já é preservado). O "você já pregou sobre isto" (histórico por
  passagem) no painel do editor fica para depois; hoje o Mapa de Escrituras já mostra o
  cruzamento livro→sermões.
- `esc()` removido (React escapa); sticks arquivadas excluídas onde listar pessoas.

## Leitura da Bíblia (spec 07)
Tela de leitura de capítulo com o texto em português ligado ao original. Atrás da flag
`study.reader` (m54, nasce `off`): desligada, `/study/bible` responde 404 e a sub-nav do
Estudo não mostra "Bíblia". Ligada, "Bíblia" entra na frente da sub-nav (`StudyTabs`).

- **Rotas:** `/study/bible` (client; abre o último capítulo lido no aparelho, senão João 1,
  e redireciona) e `/study/bible/[book]/[chapter]` (Server; o gate da flag fica aqui).
  O `[book]` da rota é **USFM** (`JHN`).
- **Arquitetura:** `page` (Server, busca tudo em paralelo) → `ReaderView` (por capítulo,
  remonta a cada navegação) + `ReaderWorkspace` (no `layout.tsx`, sobrevive à troca de
  capítulo). A área de trabalho tem abas **Palavra / Versículo / Notas / Sermão** (até
  `MAX_TABS`=5; abrir o que já está aberto só ativa) e todas ficam montadas, para o
  editor de sermão não perder estado no meio do autosave. No celular vira **gaveta**
  (meio/cheia, arrasto com peteleco e resistência; `WorkspacePane`). Regras puras em
  `reader.ts` (+ `reader.test.ts`); leituras em `reader-queries.ts`. Componentes em
  `components/reader/`.
- **Dados (globais, leitura livre, escrita só service_role — m53):**
  - `bible_tagged_words`: texto português quebrado em trechos, cada um com `strong` ou
    nulo; concatenar `text` por `position` devolve o versículo exato. Tradução `por_blj`.
  - `strongs_lexicon.gloss_pt` / `definition_pt`: glosa e definição em português; nulo
    cai no inglês.
  - RPC `strong_occurrences(p_strong)`: ocorrências agrupadas por livro/capítulo (aba
    Palavra). Agrega no banco (G3588 tem ~20 mil).
  - Sem ligação no capítulo, o texto cai no puro da Bíblia Livre via helloao.
  - **Livro:** as tabelas guardam **OSIS** (`John`), a rota fala **USFM** (`JHN`); a
    conversão é `usfmToOsis`/`osisToUsfm` (`lib/bible/osis.ts`). PostgREST corta em 1000
    linhas, então o capítulo pagina com `range()`.
- **Fontes na tela:** "Bíblia Livre (BLIVRE), CC BY 4.0" no texto; "STEPBible (CC BY 4.0)"
  no léxico e no original, com ", tradução Tally" quando a glosa/definição vem de
  `*_pt`. Não remover: é a condição da licença.
- **Regerar os dados de João** (`scripts/align/`, tudo em `work/`):
  1. `fetch-john.mjs` monta a entrada por capítulo (texto do helloao + tokens gregos);
     `fetch-lexicon.mjs` lista os Strong de João e monta lotes de 80.
  2. Subagentes geram a saída seguindo `ALIGN-PROMPT.md` (ligação) e `LEX-PROMPT.md`
     (glosas/definições PT-BR).
  3. `validate-alignment.mjs NN|all` e `validate-lexicon.mjs NN|all` recusam o que
     quebra regra (texto tem de fechar EXATO, Strong tem de existir no versículo) e
     geram os TSVs. **Cobertura mínima de 85%** das palavras gregas de conteúdo
     (Strong diferente de G3588).
  4. Carga com a service_role do dono (nunca no repo):
     `node scripts/seed-original-text.mjs tagged ./scripts/align/work/tagged-john.tsv` e
     `... lexpt ./scripts/align/work/lexpt-john.tsv`.
- **Limites conhecidos:** o sublinhado de palavras ligadas existe **só em João** (piloto);
  os outros livros mostram o texto puro. As notas da aba Notas e as da lente Notas do
  "Estudo do Texto" (mesma `study_text_notes`) não se atualizam entre si sem remontar.
