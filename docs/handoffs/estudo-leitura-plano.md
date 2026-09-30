# Tela de leitura da Bíblia (spec 07): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** entregar `/study/bible/[book]/[chapter]`, a tela de leitura com palavra tocável (chave Interlinear), balão, modo Original e área de trabalho em abas (Palavra, Versículo, Notas, Sermão), com a ligação português↔grego de João gerada e carregada.

**Arquitetura:** Server Component carrega o capítulo (de `bible_tagged_words` quando existe, senão do helloao), os tokens originais e o léxico curto; um Client Component (`ReaderView`) cuida de chave, balão e abas. Regras puras (versículos, capítulos vizinhos, ocorrências, abas, gaveta) moram em `src/features/study/reader.ts`, testadas com Vitest. Os dados de João (ligação e glosas PT) são gerados fora do app por subagentes, validados por script e carregados pelo loader existente.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript estrito · Supabase (SSR + RLS) · Vitest · Playwright.

**Spec:** `docs/specs/07-estudo-leitura.md` (aprovada 2026-09-30). Decisão do dono na Tarefa 0 da spec: **opção A**, gerar a ligação de João (a Bíblia Livre baixável não tem Strong; conferido no eBible `porbr2018` e no módulo CrossWire `PorBLivre`, 1,7 MB, sem feature Strong).

## Restrições globais

- Rodar num **git worktree** a partir do `main` commitado (superpowers:using-git-worktrees). O working tree principal tem ajustes NÃO commitados da biblioteca v2 (`StudyTabs.tsx`, `SermonLibraryV2.tsx`, `study.module.css`, `nav.ts`, `globals.css`) que o dono ainda não decidiu; não misturar.
- O hook `post-commit` faz `git push origin HEAD`: **todo commit sobe**. Na branch do worktree isso gera só preview na Vercel. Merge no `main` = produção (seguro porque a flag nasce desligada).
- TypeScript estrito: sem `any`, sem `!` de assertion, sem `console.log`, tipo de retorno explícito em função exportada (`.claude/rules/typescript.md`).
- Interface em PT-BR. Nenhuma superfície "em breve": o que não tem dado não aparece.
- Toda feature nova atrás de flag: `study.reader`, desligada em produção.
- Nada de IA na tela. A IA só é usada fora do app, para gerar dados que são revisados.
- Fontes e licenças citadas na tela: "Bíblia Livre (BLIVRE), CC BY 4.0"; "léxico STEPBible (CC BY 4.0)", mais ", tradução Tally" quando a glosa/definição for PT.
- Livros: a rota e a UI usam **USFM** (`JHN`); as tabelas bíblicas usam **OSIS** (`John`). Converter com `usfmToOsis`/`osisToUsfm` de `src/lib/bible/osis.ts`.
- PostgREST devolve no máximo 1000 linhas por chamada: toda leitura de capítulo pagina com `.range()`.
- Tokens de movimento: `--dur-micro`, `--dur-panel`, `--ease`. `prefers-reduced-motion` = só fade.
- `npm run verify` verde antes de dar qualquer tarefa por pronta. Commits em Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Paradas obrigatórias (pedir ao dono):** (1) aplicar migrations se o MCP do Supabase negar permissão (nesta sessão `execute_sql` voltou "You do not have permission"); (2) a `service_role` key para os loaders (nunca no chat, só em variável de ambiente no terminal dele); (3) revisão por amostra de João 1 antes de ligar a flag para ele.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260930120000_m53_bible_reader.sql` | criar | tabela `bible_tagged_words`, colunas `gloss_pt`/`definition_pt`, índice e RPC `strong_occurrences` |
| `supabase/migrations/20260930120100_m54_study_reader_feature_flags.sql` | criar | flag `study.reader` |
| `src/features/flags/catalog.ts` | modificar | chave `study.reader` |
| `src/lib/database.types.ts` | modificar | tipos da tabela, colunas e RPC novas |
| `src/features/study/reader.ts` (+ `reader.test.ts`) | criar | regras puras da tela |
| `src/lib/bible/helloao.ts` | criar | parse do formato helloao + busca do capítulo no servidor |
| `src/lib/bible/source.ts` | modificar | passa a importar o parse de `helloao.ts` |
| `src/features/study/reader-queries.ts` (+ `.integration.test.ts`) | criar | leituras do servidor (capítulo marcado, original, léxico) |
| `src/app/(dashboard)/study/bible/page.tsx` | criar | redireciona para o último capítulo lido |
| `src/app/(dashboard)/study/bible/[book]/[chapter]/page.tsx` | criar | página do capítulo |
| `src/features/study/components/reader/ReaderView.tsx` | criar | barra, texto, modos, balão, estado das abas |
| `src/features/study/components/reader/ChapterPicker.tsx` | criar | popover de livro/capítulo/recentes |
| `src/features/study/components/reader/WordPopover.tsx` | criar | balão da palavra |
| `src/features/study/components/reader/WorkspacePane.tsx` | criar | painel com abas + gaveta no celular |
| `src/features/study/components/reader/WordTab.tsx` | criar | Definição + Ocorrências |
| `src/features/study/components/reader/NotesTab.tsx` | criar | notas da passagem |
| `src/features/study/components/reader/SermonTab.tsx` | criar | escolher sermão + editor embutido |
| `src/features/study/components/reader/reader.module.css` | criar | estilos da tela |
| `src/features/study/components/StudyTabs.tsx` | modificar | item "Bíblia" quando a flag estiver ligada |
| `src/app/(dashboard)/study/{page,notes/page,series/page}.tsx` | modificar | passam `reader` para a sub-nav |
| `src/features/study/components/BibleCompare.tsx` | modificar | prop `embedded` (sem overlay) |
| `src/features/study/components/SermonEditor.tsx` | modificar | props `embedded` e `incoming` |
| `scripts/align/*.mjs` | criar | geração/validação dos dados de João |
| `scripts/seed-original-text.mjs` | modificar | modos `tagged` e `lexpt` |
| `e2e/reader.spec.ts` | criar | fumaça da tela |
| `src/features/study/README.md`, `docs/orchestrator-state.md` | modificar | documentação |

As Tarefas 9 e 10 (dados) dependem só da Tarefa 1 e podem correr em paralelo com as Tarefas 2 a 8.

---

### Task 1: Banco (tabela, colunas, RPC, flag) e tipos

**Files:**
- Create: `supabase/migrations/20260930120000_m53_bible_reader.sql`
- Create: `supabase/migrations/20260930120100_m54_study_reader_feature_flags.sql`
- Modify: `src/features/flags/catalog.ts:10-31`
- Modify: `src/lib/database.types.ts` (tabelas `strongs_lexicon` ~l.3509, nova `bible_tagged_words`, `Functions`)
- Test: `src/features/flags/catalog.test.ts` (já existe; garante SQL ↔ catálogo)

**Interfaces:**
- Produces: tabela `public.bible_tagged_words(translation, book, chapter, verse, position, text, strong)`; colunas `strongs_lexicon.gloss_pt`, `strongs_lexicon.definition_pt`; RPC `strong_occurrences(p_strong text) → table(book text, chapter int, n int)`; `FlagKey` `"study.reader"`.

- [ ] **Step 1: Rodar o teste do catálogo antes de mexer (deve passar)**

Run: `npx vitest run src/features/flags/catalog.test.ts`
Expected: PASS

- [ ] **Step 2: Criar a migration da flag (sem catálogo ainda, o teste deve falhar)**

`supabase/migrations/20260930120100_m54_study_reader_feature_flags.sql`:

```sql
-- m54: flag da tela de leitura da Bíblia (spec 07). Nasce rollout='off' + enabled=false,
-- como todas. Desligada, /study/bible não existe (404) e a sub-nav não mostra "Bíblia".
-- Reverter: delete from public.feature_flags where key = 'study.reader';
insert into public.feature_flags (key, description) values
  ('study.reader', 'Tela de leitura da Bíblia (spec 07)')
on conflict (key) do nothing;
```

Run: `npx vitest run src/features/flags/catalog.test.ts`
Expected: FAIL (a chave `study.reader` existe no SQL e não no catálogo)

- [ ] **Step 3: Acrescentar a chave no catálogo**

Em `src/features/flags/catalog.ts`, na união `FlagKey` depois de `| "study.library_v2"` acrescentar `| "study.reader"`, e em `ALL_FLAGS` depois de `"study.library_v2",` acrescentar `"study.reader",`.

Run: `npx vitest run src/features/flags/catalog.test.ts`
Expected: PASS

- [ ] **Step 4: Criar a migration de dados da leitura**

`supabase/migrations/20260930120000_m53_bible_reader.sql`:

```sql
-- m53: tela de leitura (spec 07). Dado de referência GLOBAL (sem org_id), leitura livre,
-- escrita só service_role — igual a bible_original_tokens (m34) e strong_frequency (m35).
--
-- bible_tagged_words: o texto português quebrado em trechos, cada um ligado (ou não) a um
-- número Strong. Concatenar `text` na ordem de `position` devolve o versículo exato.
-- `book` em OSIS ('John'), como bible_original_tokens.
create table if not exists public.bible_tagged_words (
  translation text not null,           -- 'por_blj' (Bíblia Livre)
  book        text not null,
  chapter     int  not null,
  verse       int  not null,
  position    int  not null,
  text        text not null,
  strong      text,                    -- 'G3056'; null = sem palavra original (espaço, pontuação, palavra de apoio)
  primary key (translation, book, chapter, verse, position)
);
alter table public.bible_tagged_words enable row level security;
drop policy if exists tagged_words_read on public.bible_tagged_words;
create policy tagged_words_read on public.bible_tagged_words for select using (true);

-- Glosa e definição curta em português (piloto João). Nulo = a tela usa o inglês.
alter table public.strongs_lexicon add column if not exists gloss_pt text;
alter table public.strongs_lexicon add column if not exists definition_pt text;

-- Ocorrências de um Strong agrupadas por livro/capítulo (aba "Ocorrências"). Agrega no
-- banco para não trazer milhares de linhas (G3588 tem ~20 mil).
create index if not exists bible_original_tokens_strong_idx on public.bible_original_tokens (strong);

create or replace function public.strong_occurrences(p_strong text)
returns table (book text, chapter int, n int)
language sql stable security invoker set search_path = public as $$
  select t.book, t.chapter, count(*)::int
  from public.bible_original_tokens t
  where t.strong = p_strong
  group by t.book, t.chapter
$$;
grant execute on function public.strong_occurrences(text) to anon, authenticated;

-- Reverter:
-- drop function if exists public.strong_occurrences(text);
-- drop index if exists public.bible_original_tokens_strong_idx;
-- alter table public.strongs_lexicon drop column if exists definition_pt, drop column if exists gloss_pt;
-- drop table if exists public.bible_tagged_words;
```

- [ ] **Step 5: Aplicar as duas migrations**

Tentar `mcp__…__apply_migration` (project `zzgxeylyrtzsqcdguxql`) com o SQL de m53 e depois m54. **Se o MCP negar permissão: PARAR** e pedir ao dono para colar os dois arquivos, nessa ordem, em Supabase → SQL Editor → Run. Conferir depois com a leitura pública (anon key do `.env.local`):

Run: `node --env-file=.env.local -e "fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/strong_occurrences',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_strong:'G3056'})}).then(r=>r.json()).then(j=>console.log(Array.isArray(j)?j.length+' linhas':j))"`
Expected: `NN linhas` (um número > 0), não um objeto de erro.

- [ ] **Step 6: Atualizar os tipos do banco à mão**

Em `src/lib/database.types.ts`:

1. Em `strongs_lexicon`, acrescentar `definition_pt: string | null` e `gloss_pt: string | null` em `Row`, e `definition_pt?: string | null` e `gloss_pt?: string | null` em `Insert` e `Update` (ordem alfabética, como o gerador faz).
2. Em `Tables`, antes de `bible_original_tokens` (ordem alfabética), acrescentar:

```ts
      bible_tagged_words: {
        Row: {
          book: string
          chapter: number
          position: number
          strong: string | null
          text: string
          translation: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          position: number
          strong?: string | null
          text: string
          translation: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          position?: number
          strong?: string | null
          text?: string
          translation?: string
          verse?: number
        }
        Relationships: []
      }
```

3. Em `Functions` (~l.4009), na posição alfabética:

```ts
      strong_occurrences: {
        Args: { p_strong: string }
        Returns: { book: string; chapter: number; n: number }[]
      }
```

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260930120000_m53_bible_reader.sql supabase/migrations/20260930120100_m54_study_reader_feature_flags.sql src/features/flags/catalog.ts src/lib/database.types.ts
git commit -m "feat(study): banco da tela de leitura (m53/m54) e flag study.reader"
```

---

### Task 2: Regras puras da tela (`reader.ts`)

**Files:**
- Create: `src/features/study/reader.ts`
- Test: `src/features/study/reader.test.ts`

**Interfaces:**
- Consumes: `BOOKS`, `bookByCode`, `bookName` (`@/lib/bible/books`); `osisToUsfm` (`@/lib/bible/osis`).
- Produces (usadas nas Tarefas 3 a 8):
  - `interface Span { text: string; strong: string | null }`, `interface ReaderVerse { n: number; spans: Span[] }`
  - `interface TaggedWordRow { verse: number; position: number; text: string; strong: string | null }`
  - `interface OrigWord { verse: number; position: number; surface: string; strong: string | null; translit: string | null; lang: string }`
  - `interface LexShort { strong: string; lemma: string | null; translit: string | null; gloss: string | null; gloss_pt: string | null }`
  - `interface ChapterRef { book: string; chapter: number }` (book em USFM)
  - `versesFromTagged(rows: TaggedWordRow[]): ReaderVerse[]`, `versesFromPlain(vs: { n: number; text: string }[]): ReaderVerse[]`, `groupOriginal(words: OrigWord[]): { n: number; words: OrigWord[] }[]`
  - `chapterCount(book: string): number`, `parseRouteRef(book: string, chapter: string): ChapterRef | null`, `adjacentChapter(ref: ChapterRef, dir: -1 | 1): ChapterRef | null`, `chapterLabel(ref: ChapterRef): string`
  - `LAST_READ_KEY`, `RECENT_KEY`, `parseLastRead(raw: string | null): ChapterRef`, `pushRecent(list: ChapterRef[], ref: ChapterRef): ChapterRef[]`
  - `glossOf(l: LexShort | undefined): string`, `isHebrew(strong: string): boolean`
  - `interface OccRow { book: string; chapter: number; n: number }`, `interface OccBook { book: string; name: string; total: number; chapters: { chapter: number; n: number }[] }`, `groupOccurrences(rows: OccRow[]): OccBook[]`
  - `type WsTab = { kind: "word"; strong: string } | { kind: "verse"; verse: number } | { kind: "notes" } | { kind: "sermon" }`, `interface Workspace { tabs: WsTab[]; active: string | null }`, `MAX_TABS = 5`, `EMPTY_WS`, `tabKey(t: WsTab): string`, `openTab(ws: Workspace, t: WsTab): Workspace`, `closeTab(ws: Workspace, key: string): Workspace`
  - `type SheetState = "half" | "full"`, `sheetAfterDrag(state: SheetState, dy: number, velocity: number): SheetState | "closed"`, `rubberband(overshoot: number, dimension: number): number`

- [ ] **Step 1: Escrever os testes (falham: módulo não existe)**

`src/features/study/reader.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  EMPTY_WS,
  MAX_TABS,
  adjacentChapter,
  chapterCount,
  closeTab,
  glossOf,
  groupOccurrences,
  groupOriginal,
  openTab,
  parseLastRead,
  parseRouteRef,
  pushRecent,
  rubberband,
  sheetAfterDrag,
  tabKey,
  versesFromPlain,
  versesFromTagged,
  type Workspace,
} from "./reader";

describe("versículos", () => {
  it("versesFromTagged agrupa por versículo e ordena por posição", () => {
    const v = versesFromTagged([
      { verse: 1, position: 2, text: " ", strong: null },
      { verse: 2, position: 1, text: "Esta", strong: "G3778" },
      { verse: 1, position: 1, text: "No princípio", strong: "G0746" },
      { verse: 1, position: 3, text: "era", strong: "G1510" },
    ]);
    expect(v.map((x) => x.n)).toEqual([1, 2]);
    expect(v[0]?.spans.map((s) => s.text).join("")).toBe("No princípio era");
    expect(v[0]?.spans[0]?.strong).toBe("G0746");
  });

  it("versesFromPlain vira um trecho sem Strong por versículo", () => {
    expect(versesFromPlain([{ n: 3, text: "Todas as coisas" }])).toEqual([{ n: 3, spans: [{ text: "Todas as coisas", strong: null }] }]);
  });

  it("groupOriginal agrupa tokens por versículo em ordem", () => {
    const g = groupOriginal([
      { verse: 2, position: 1, surface: "οὗτος", strong: "G3778", translit: "houtos", lang: "grc" },
      { verse: 1, position: 2, surface: "ἀρχῇ", strong: "G0746", translit: "archē", lang: "grc" },
      { verse: 1, position: 1, surface: "Ἐν", strong: "G1722", translit: "En", lang: "grc" },
    ]);
    expect(g.map((x) => x.n)).toEqual([1, 2]);
    expect(g[0]?.words.map((w) => w.surface)).toEqual(["Ἐν", "ἀρχῇ"]);
  });
});

describe("capítulos", () => {
  it("chapterCount conhece o cânon (1189 capítulos)", () => {
    expect(chapterCount("JHN")).toBe(21);
    expect(chapterCount("PSA")).toBe(150);
    expect(chapterCount("XXX")).toBe(0);
  });

  it("parseRouteRef aceita USFM em qualquer caixa e recusa capítulo fora do livro", () => {
    expect(parseRouteRef("jhn", "1")).toEqual({ book: "JHN", chapter: 1 });
    expect(parseRouteRef("JHN", "22")).toBeNull();
    expect(parseRouteRef("JHN", "abc")).toBeNull();
    expect(parseRouteRef("XXX", "1")).toBeNull();
  });

  it("adjacentChapter cruza livros e para nas pontas do cânon", () => {
    expect(adjacentChapter({ book: "JHN", chapter: 1 }, -1)).toEqual({ book: "LUK", chapter: 24 });
    expect(adjacentChapter({ book: "JHN", chapter: 21 }, 1)).toEqual({ book: "ACT", chapter: 1 });
    expect(adjacentChapter({ book: "JHN", chapter: 3 }, 1)).toEqual({ book: "JHN", chapter: 4 });
    expect(adjacentChapter({ book: "GEN", chapter: 1 }, -1)).toBeNull();
    expect(adjacentChapter({ book: "REV", chapter: 22 }, 1)).toBeNull();
  });

  it("parseLastRead cai em João 1 com lixo ou capítulo inválido", () => {
    expect(parseLastRead(null)).toEqual({ book: "JHN", chapter: 1 });
    expect(parseLastRead("{quebrado")).toEqual({ book: "JHN", chapter: 1 });
    expect(parseLastRead(JSON.stringify({ book: "ROM", chapter: 8 }))).toEqual({ book: "ROM", chapter: 8 });
    expect(parseLastRead(JSON.stringify({ book: "ROM", chapter: 99 }))).toEqual({ book: "JHN", chapter: 1 });
  });

  it("pushRecent põe na frente, sem repetir, no máximo 3", () => {
    const a = { book: "JHN", chapter: 1 };
    const b = { book: "ROM", chapter: 8 };
    const c = { book: "PSA", chapter: 23 };
    const d = { book: "GEN", chapter: 1 };
    expect(pushRecent([a, b, c], d)).toEqual([d, a, b]);
    expect(pushRecent([a, b, c], b)).toEqual([b, a, c]);
  });
});

describe("léxico e ocorrências", () => {
  it("glossOf prefere o português e cai no inglês", () => {
    expect(glossOf({ strong: "G3056", lemma: "λόγος", translit: "logos", gloss: "word", gloss_pt: "palavra, razão" })).toBe("palavra, razão");
    expect(glossOf({ strong: "G3056", lemma: "λόγος", translit: "logos", gloss: "word", gloss_pt: null })).toBe("word");
    expect(glossOf(undefined)).toBe("");
  });

  it("groupOccurrences converte OSIS, soma e ordena pelo cânon", () => {
    const g = groupOccurrences([
      { book: "Amos", chapter: 6, n: 2 },
      { book: "Gen", chapter: 10, n: 1 },
      { book: "Gen", chapter: 1, n: 1 },
      { book: "Tobit", chapter: 1, n: 5 },
    ]);
    expect(g.map((b) => b.book)).toEqual(["GEN", "AMO"]);
    expect(g[0]?.total).toBe(2);
    expect(g[0]?.chapters.map((c) => c.chapter)).toEqual([1, 10]);
    expect(g[0]?.name).toBe("Gênesis");
  });
});

describe("área de trabalho", () => {
  it("abrir a mesma aba só ativa; abrir outra acrescenta e ativa", () => {
    let ws: Workspace = openTab(EMPTY_WS, { kind: "word", strong: "G3056" });
    ws = openTab(ws, { kind: "notes" });
    ws = openTab(ws, { kind: "word", strong: "G3056" });
    expect(ws.tabs.length).toBe(2);
    expect(ws.active).toBe("word:G3056");
  });

  it("a 6ª aba derruba a mais antiga", () => {
    let ws: Workspace = EMPTY_WS;
    for (let v = 1; v <= MAX_TABS + 1; v++) ws = openTab(ws, { kind: "verse", verse: v });
    expect(ws.tabs.length).toBe(MAX_TABS);
    expect(ws.tabs.map(tabKey)[0]).toBe("verse:2");
    expect(ws.active).toBe("verse:6");
  });

  it("fechar a ativa ativa a vizinha; fechar a última esvazia", () => {
    let ws: Workspace = openTab(openTab(EMPTY_WS, { kind: "notes" }), { kind: "sermon" });
    ws = closeTab(ws, "sermon");
    expect(ws.active).toBe("notes");
    ws = closeTab(ws, "notes");
    expect(ws).toEqual({ tabs: [], active: null });
  });
});

describe("gaveta (celular)", () => {
  it("peteleco para baixo fecha a meia gaveta e baixa a cheia", () => {
    expect(sheetAfterDrag("half", 30, 0.5)).toBe("closed");
    expect(sheetAfterDrag("full", 30, 0.5)).toBe("half");
  });
  it("arrastar para cima abre cheia; movimento pequeno e lento não muda nada", () => {
    expect(sheetAfterDrag("half", -100, -0.05)).toBe("full");
    expect(sheetAfterDrag("half", 10, 0.02)).toBe("half");
  });
  it("rubberband resiste cada vez mais", () => {
    const a = rubberband(50, 800);
    const b = rubberband(200, 800);
    expect(a).toBeLessThan(50);
    expect(b - a).toBeLessThan(150);
  });
});
```

Run: `npx vitest run src/features/study/reader.test.ts`
Expected: FAIL ("Failed to resolve import ./reader")

- [ ] **Step 2: Implementar `reader.ts`**

`src/features/study/reader.ts`:

```ts
// Tela de leitura (spec 07): regras PURAS — montar versículos, capítulos vizinhos,
// ocorrências por livro, abas da área de trabalho e a gaveta do celular. Sem React,
// sem Supabase: tudo aqui é testável em reader.test.ts.
import { BOOKS, bookByCode, bookName } from "@/lib/bible/books";
import { osisToUsfm } from "@/lib/bible/osis";

export interface Span {
  text: string;
  strong: string | null;
}
export interface ReaderVerse {
  n: number;
  spans: Span[];
}
export interface TaggedWordRow {
  verse: number;
  position: number;
  text: string;
  strong: string | null;
}
export interface OrigWord {
  verse: number;
  position: number;
  surface: string;
  strong: string | null;
  translit: string | null;
  lang: string;
}
export interface LexShort {
  strong: string;
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  gloss_pt: string | null;
}
// Livro em USFM (JHN), como a rota e BOOKS.
export interface ChapterRef {
  book: string;
  chapter: number;
}

export function versesFromTagged(rows: TaggedWordRow[]): ReaderVerse[] {
  const byVerse = new Map<number, TaggedWordRow[]>();
  for (const r of rows) {
    const list = byVerse.get(r.verse) ?? [];
    list.push(r);
    byVerse.set(r.verse, list);
  }
  return [...byVerse.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, list]) => ({
      n,
      spans: [...list].sort((a, b) => a.position - b.position).map((w) => ({ text: w.text, strong: w.strong || null })),
    }));
}

export function versesFromPlain(vs: { n: number; text: string }[]): ReaderVerse[] {
  return vs.map((v) => ({ n: v.n, spans: [{ text: v.text, strong: null }] }));
}

export function groupOriginal(words: OrigWord[]): { n: number; words: OrigWord[] }[] {
  const byVerse = new Map<number, OrigWord[]>();
  for (const w of words) {
    const list = byVerse.get(w.verse) ?? [];
    list.push(w);
    byVerse.set(w.verse, list);
  }
  return [...byVerse.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, list]) => ({ n, words: [...list].sort((a, b) => a.position - b.position) }));
}

// Capítulos por livro, ordem canônica 1..66 (a mesma de BOOKS por `order`). Total 1189.
const COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4,
  7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
];
const ORDERED: string[] = [...BOOKS].sort((a, b) => a.order - b.order).map((b) => b.code);
const CHAPTERS: Record<string, number> = Object.fromEntries(ORDERED.map((code, i) => [code, COUNTS[i] ?? 0]));

export function chapterCount(book: string): number {
  return CHAPTERS[book] ?? 0;
}

export function parseRouteRef(book: string, chapter: string): ChapterRef | null {
  const code = (book || "").toUpperCase();
  if (!bookByCode(code)) return null;
  if (!/^\d+$/.test(chapter || "")) return null;
  const n = Number(chapter);
  return n >= 1 && n <= chapterCount(code) ? { book: code, chapter: n } : null;
}

export function adjacentChapter(ref: ChapterRef, dir: -1 | 1): ChapterRef | null {
  const next = ref.chapter + dir;
  if (next >= 1 && next <= chapterCount(ref.book)) return { book: ref.book, chapter: next };
  const book = ORDERED[ORDERED.indexOf(ref.book) + dir];
  if (!book) return null;
  return { book, chapter: dir === 1 ? 1 : chapterCount(book) };
}

export function chapterLabel(ref: ChapterRef): string {
  return `${bookName(ref.book)} ${ref.chapter}`;
}

// Preferências por aparelho (localStorage). Chaves com prefixo do app.
export const LAST_READ_KEY = "tally.reader.last";
export const RECENT_KEY = "tally.reader.recent";
const FALLBACK: ChapterRef = { book: "JHN", chapter: 1 };

export function parseLastRead(raw: string | null): ChapterRef {
  if (!raw) return FALLBACK;
  try {
    const v = JSON.parse(raw) as { book?: unknown; chapter?: unknown };
    if (typeof v.book !== "string" || typeof v.chapter !== "number") return FALLBACK;
    return parseRouteRef(v.book, String(v.chapter)) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function pushRecent(list: ChapterRef[], ref: ChapterRef): ChapterRef[] {
  const same = (a: ChapterRef): boolean => a.book === ref.book && a.chapter === ref.chapter;
  return [ref, ...list.filter((a) => !same(a))].slice(0, 3);
}

export function glossOf(l: LexShort | undefined): string {
  return (l?.gloss_pt || l?.gloss || "").trim();
}

export function isHebrew(strong: string): boolean {
  return strong.startsWith("H");
}

// Ocorrências: a RPC strong_occurrences devolve OSIS; o app fala USFM. Livro fora dos 66
// (apócrifo) é descartado.
export interface OccRow {
  book: string;
  chapter: number;
  n: number;
}
export interface OccBook {
  book: string;
  name: string;
  total: number;
  chapters: { chapter: number; n: number }[];
}

export function groupOccurrences(rows: OccRow[]): OccBook[] {
  const map = new Map<string, OccBook>();
  for (const r of rows) {
    const usfm = osisToUsfm(r.book);
    if (!usfm) continue;
    const b = map.get(usfm) ?? { book: usfm, name: bookName(usfm), total: 0, chapters: [] };
    b.total += r.n;
    b.chapters.push({ chapter: r.chapter, n: r.n });
    map.set(usfm, b);
  }
  return [...map.values()]
    .sort((a, b) => ORDERED.indexOf(a.book) - ORDERED.indexOf(b.book))
    .map((b) => ({ ...b, chapters: [...b.chapters].sort((x, y) => x.chapter - y.chapter) }));
}

// Área de trabalho: abas com chave estável. Abrir o que já está aberto só ativa.
export type WsTab = { kind: "word"; strong: string } | { kind: "verse"; verse: number } | { kind: "notes" } | { kind: "sermon" };
export interface Workspace {
  tabs: WsTab[];
  active: string | null;
}
export const MAX_TABS = 5;
export const EMPTY_WS: Workspace = { tabs: [], active: null };

export function tabKey(t: WsTab): string {
  if (t.kind === "word") return "word:" + t.strong;
  if (t.kind === "verse") return "verse:" + t.verse;
  return t.kind;
}

export function openTab(ws: Workspace, t: WsTab): Workspace {
  const key = tabKey(t);
  if (ws.tabs.some((x) => tabKey(x) === key)) return { tabs: ws.tabs, active: key };
  const tabs = [...ws.tabs, t];
  return { tabs: tabs.length > MAX_TABS ? tabs.slice(tabs.length - MAX_TABS) : tabs, active: key };
}

export function closeTab(ws: Workspace, key: string): Workspace {
  const i = ws.tabs.findIndex((x) => tabKey(x) === key);
  if (i < 0) return ws;
  const tabs = ws.tabs.filter((_, j) => j !== i);
  if (ws.active !== key) return { tabs, active: ws.active };
  const neighbor = tabs[i] ?? tabs[i - 1];
  return { tabs, active: neighbor ? tabKey(neighbor) : null };
}

// Gaveta do celular. Decide pelo peteleco (velocidade em px/ms, positivo = para baixo)
// antes da distância: um toque rápido basta, não precisa arrastar até o fim.
export type SheetState = "half" | "full";
const FLICK = 0.11;

export function sheetAfterDrag(state: SheetState, dy: number, velocity: number): SheetState | "closed" {
  const down = velocity > FLICK || dy > 120;
  const up = velocity < -FLICK || dy < -80;
  if (down) return state === "full" ? "half" : "closed";
  if (up) return "full";
  return state;
}

// Resistência progressiva ao arrastar além do limite (fórmula da Apple).
export function rubberband(overshoot: number, dimension: number): number {
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}
```

- [ ] **Step 3: Rodar os testes**

Run: `npx vitest run src/features/study/reader.test.ts`
Expected: PASS (todos). Se `groupOccurrences` falhar em `name`, conferir `bookName("GEN")` em `books.ts` (deve ser "Gênesis") e ajustar só o teste.

- [ ] **Step 4: Commit**

```bash
git add src/features/study/reader.ts src/features/study/reader.test.ts
git commit -m "feat(study): regras puras da tela de leitura"
```

---

### Task 3: Leituras do servidor (helloao + tabelas bíblicas)

**Files:**
- Create: `src/lib/bible/helloao.ts`
- Modify: `src/lib/bible/source.ts` (remove `RawVerse`, `versesFrom`, `verseText` locais; importa de `helloao.ts`)
- Create: `src/features/study/reader-queries.ts`
- Test: `src/features/study/reader-queries.integration.test.ts`

**Interfaces:**
- Consumes: `TaggedWordRow`, `OrigWord`, `LexShort` (Task 2); `DB` (`@/lib/auth/session`).
- Produces: `fetchChapterText(translationId: string, book: string, chapter: number): Promise<{ n: number; text: string }[]>`; `READER_TRANSLATION = "por_blj"`; `getTaggedChapter(supabase: DB, osis: string, chapter: number): Promise<TaggedWordRow[]>`; `getOriginalChapter(supabase: DB, osis: string, chapter: number): Promise<OrigWord[]>`; `getLexShort(supabase: DB, strongs: string[]): Promise<Record<string, LexShort>>`.

- [ ] **Step 1: Escrever o teste de integração (falha: módulo não existe)**

`src/features/study/reader-queries.integration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { getLexShort, getOriginalChapter, getTaggedChapter } from "./reader-queries";

// Integração: tabelas bíblicas GLOBAIS (leitura livre). João 1 tem grego (m34); a
// ligação em português só existe depois da Tarefa 9 — o teste aceita vazio.
describe.skipIf(!hasTestFixture)("reader queries (integração)", () => {
  it("getOriginalChapter pagina e devolve João 1 inteiro, em ordem", async () => {
    const { supabase } = await signInTestUser();
    const words = await getOriginalChapter(supabase, "John", 1);
    expect(words.length).toBeGreaterThan(500);
    expect(words[0]?.verse).toBe(1);
    expect(words[0]?.position).toBe(1);
    expect(words.at(-1)?.verse).toBe(51);
  });

  it("getLexShort traz lema e glosa do Strong", async () => {
    const { supabase } = await signInTestUser();
    const lex = await getLexShort(supabase, ["G3056"]);
    expect(lex["G3056"]?.lemma).toBe("λόγος");
  });

  it("getTaggedChapter devolve trechos ordenados (ou vazio antes da carga)", async () => {
    const { supabase } = await signInTestUser();
    const rows = await getTaggedChapter(supabase, "John", 1);
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      if (a && b) expect(a.verse < b.verse || (a.verse === b.verse && a.position < b.position)).toBe(true);
    }
  });
});
```

Run: `npx vitest run src/features/study/reader-queries.integration.test.ts`
Expected: FAIL (import) — ou SKIP se não houver fixture (`.env.test`); nesse caso seguir e confiar no typecheck.

- [ ] **Step 2: Extrair o parse do helloao**

`src/lib/bible/helloao.ts`:

```ts
// Formato da Free Use Bible API (helloao): parse puro + busca do capítulo no SERVIDOR.
// Sem "use client": é usado pela página da leitura (Server Component) e por source.ts.
const BASE = "https://bible.helloao.org/api";

export interface RawVerse {
  type?: string;
  number: number;
  content?: (string | { text?: string })[];
}

export function versesFrom(data: unknown): RawVerse[] {
  const d = data as { chapter?: { content?: unknown }; content?: unknown } | null;
  const arr = (d && d.chapter && d.chapter.content) || (d && d.content) || [];
  if (!Array.isArray(arr)) return [];
  return (arr as RawVerse[]).filter((x) => x && x.type === "verse");
}

export function verseText(v: RawVerse): string {
  const parts = (v.content || []).map((seg) => {
    if (typeof seg === "string") return seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Capítulo inteiro, com cache de 1 dia no servidor (o texto não muda).
export async function fetchChapterText(translationId: string, book: string, chapter: number): Promise<{ n: number; text: string }[]> {
  const r = await fetch(`${BASE}/${translationId}/${book}/${chapter}.json`, { next: { revalidate: 86400 } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return versesFrom(await r.json()).map((v) => ({ n: v.number, text: verseText(v) }));
}
```

Em `src/lib/bible/source.ts`: apagar a `interface RawVerse` e as funções `versesFrom` e `verseText` (linhas ~26-49) e acrescentar depois de `"use client";`:

```ts
import { versesFrom, verseText } from "./helloao";
```

Run: `npx vitest run src/lib/bible && npm run typecheck`
Expected: PASS, sem erros de tipo.

- [ ] **Step 3: Escrever `reader-queries.ts`**

```ts
// Leituras da tela de leitura (spec 07). Tabelas bíblicas GLOBAIS (sem org_id, leitura
// livre por RLS). `book` aqui é OSIS ('John'). PostgREST corta em 1000 linhas por
// chamada, então capítulo pagina com range().
import type { DB } from "@/lib/auth/session";
import type { LexShort, OrigWord, TaggedWordRow } from "./reader";

export const READER_TRANSLATION = "por_blj"; // Bíblia Livre (CC BY 4.0)
const PAGE = 1000;

async function pageAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export async function getTaggedChapter(supabase: DB, osis: string, chapter: number): Promise<TaggedWordRow[]> {
  return pageAll((from, to) =>
    supabase
      .from("bible_tagged_words")
      .select("verse, position, text, strong")
      .eq("translation", READER_TRANSLATION)
      .eq("book", osis)
      .eq("chapter", chapter)
      .order("verse")
      .order("position")
      .range(from, to),
  );
}

export async function getOriginalChapter(supabase: DB, osis: string, chapter: number): Promise<OrigWord[]> {
  return pageAll((from, to) =>
    supabase
      .from("bible_original_tokens")
      .select("verse, position, surface, strong, translit, lang")
      .eq("book", osis)
      .eq("chapter", chapter)
      .order("verse")
      .order("position")
      .range(from, to),
  );
}

// Léxico curto (balão e modo Original). A definição longa é buscada na aba Palavra.
export async function getLexShort(supabase: DB, strongs: string[]): Promise<Record<string, LexShort>> {
  const out: Record<string, LexShort> = {};
  for (let i = 0; i < strongs.length; i += 300) {
    const { data, error } = await supabase
      .from("strongs_lexicon")
      .select("strong, lemma, translit, gloss, gloss_pt")
      .in("strong", strongs.slice(i, i + 300));
    if (error) throw new Error(error.message);
    for (const l of data ?? []) out[l.strong] = l;
  }
  return out;
}
```

- [ ] **Step 4: Rodar teste e tipos**

Run: `npx vitest run src/features/study/reader-queries.integration.test.ts && npm run typecheck`
Expected: PASS (ou SKIP sem fixture) e typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bible/helloao.ts src/lib/bible/source.ts src/features/study/reader-queries.ts src/features/study/reader-queries.integration.test.ts
git commit -m "feat(study): leituras do servidor para a tela de leitura"
```

---

### Task 4: Rota, texto do capítulo, troca de capítulo e sub-nav

**Files:**
- Create: `src/app/(dashboard)/study/bible/page.tsx`
- Create: `src/app/(dashboard)/study/bible/[book]/[chapter]/page.tsx`
- Create: `src/features/study/components/reader/ReaderView.tsx`
- Create: `src/features/study/components/reader/ChapterPicker.tsx`
- Create: `src/features/study/components/reader/reader.module.css`
- Modify: `src/features/study/components/StudyTabs.tsx`
- Modify: `src/app/(dashboard)/study/page.tsx:26`, `src/app/(dashboard)/study/notes/page.tsx:21`, `src/app/(dashboard)/study/series/page.tsx:18`

**Interfaces:**
- Consumes: Task 2 (`parseRouteRef`, `adjacentChapter`, `chapterLabel`, `chapterCount`, `versesFromTagged`, `versesFromPlain`, `parseLastRead`, `pushRecent`, `LAST_READ_KEY`, `RECENT_KEY`), Task 3 (queries, `fetchChapterText`, `READER_TRANSLATION`).
- Produces: `ReaderView` com props `{ refNow: ChapterRef; verses: ReaderVerse[]; tagged: boolean; original: OrigWord[]; lex: Record<string, LexShort>; textError: string; editor: EditorData }` e `export interface EditorData { sermons: Sermon[]; series: Series[]; services: { id: string; name: string }[]; campuses: string[]; activeCampus: string; locale: string }`. Tarefas 5 a 8 editam `ReaderView.tsx`.

- [ ] **Step 1: Sub-nav com "Bíblia"**

Em `src/features/study/components/StudyTabs.tsx` (versão commitada): trocar a assinatura e o cálculo das abas. Com a flag ligada o item "Bíblia" entra na frente e a sub-nav continua com 3 itens; o que sobra vai para o "···".

```tsx
const TABS_READER: [string, string][] = [
  ["/study/bible", "Bíblia"],
  ["/study", "Biblioteca"],
  ["/study/notes", "Notas"],
];
const TABS_V2_READER: [string, string][] = [
  ["/study/bible", "Bíblia"],
  ["/study", "Sermões"],
  ["/study/series", "Séries"],
];
const OVERFLOW_READER: [string, string][] = [
  ["/study/notes", "Notas"],
  ["/study/map", "Mapa de Escrituras"],
];

export function StudyTabs({ v2 = false, reader = false }: { v2?: boolean; reader?: boolean }) {
  const path = usePathname();
  const tabs = reader ? (v2 ? TABS_V2_READER : TABS_READER) : v2 ? TABS_V2 : TABS;
  const overflow = v2 ? (reader ? OVERFLOW_READER : OVERFLOW) : [];
  const isOn = (href: string): boolean => (href === "/study/bible" ? path.startsWith(href) : path === href);
```

e no JSX trocar `path === href` por `isOn(href)`, `{v2 ? (` por `{overflow.length ? (` e as duas ocorrências de `OVERFLOW` por `overflow`.

Nas três páginas passar a flag: `src/app/(dashboard)/study/page.tsx` → `<StudyTabs v2={v2} reader={flagOn(ctx, "study.reader")} />`; `notes/page.tsx` → `<StudyTabs v2={flagOn(ctx, "study.library_v2")} reader={flagOn(ctx, "study.reader")} />`; `series/page.tsx` → `<StudyTabs v2 reader={flagOn(ctx, "study.reader")} />`.

- [ ] **Step 2: Página de entrada (último capítulo lido)**

`src/app/(dashboard)/study/bible/page.tsx`:

```tsx
"use client";

// /study/bible sem capítulo: abre o último lido neste aparelho, ou João 1. O gate da flag
// fica na página do capítulo (Server Component), para onde isto sempre redireciona.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LAST_READ_KEY, parseLastRead } from "@/features/study/reader";

export default function BibleEntryPage(): null {
  const router = useRouter();
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(LAST_READ_KEY);
    } catch {
      raw = null;
    }
    const ref = parseLastRead(raw);
    router.replace(`/study/bible/${ref.book}/${ref.chapter}`);
  }, [router]);
  return null;
}
```

- [ ] **Step 3: Página do capítulo**

`src/app/(dashboard)/study/bible/[book]/[chapter]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { resolveActiveCampus } from "@/lib/campus";
import { usfmToOsis } from "@/lib/bible/osis";
import { fetchChapterText } from "@/lib/bible/helloao";
import { listSermons, listSeries } from "@/features/study/queries";
import { listServices } from "@/features/services/queries";
import { parseRouteRef, versesFromPlain, versesFromTagged, type ReaderVerse } from "@/features/study/reader";
import { READER_TRANSLATION, getLexShort, getOriginalChapter, getTaggedChapter } from "@/features/study/reader-queries";
import { ReaderView } from "@/features/study/components/reader/ReaderView";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Leitura da Bíblia (spec 07). Texto: bible_tagged_words quando o capítulo tem a ligação
// com o original (piloto: João); senão o texto puro da Bíblia Livre (helloao). Atrás de
// `study.reader`: desligada, a rota não existe.
export default async function BibleChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const p = await params;
  const ctx = await requireOrg();
  if (!flagOn(ctx, "study.reader")) notFound();
  const ref = parseRouteRef(p.book, p.chapter);
  if (!ref) notFound();
  const osis = usfmToOsis(ref.book);
  if (!osis) notFound();
  const { supabase, orgId, user } = ctx;

  const [tagged, original, sermons, series, services, campusRes, profRes] = await Promise.all([
    getTaggedChapter(supabase, osis, ref.chapter),
    getOriginalChapter(supabase, osis, ref.chapter),
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    listServices(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
    supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle(),
  ]);

  let verses: ReaderVerse[] = [];
  let textError = "";
  if (tagged.length) {
    verses = versesFromTagged(tagged);
  } else {
    try {
      verses = versesFromPlain(await fetchChapterText(READER_TRANSLATION, ref.book, ref.chapter));
    } catch {
      textError = "Não consegui carregar o texto agora. Tente de novo em instantes.";
    }
  }

  const strongs = [...new Set([...tagged, ...original].map((w) => w.strong).filter((s): s is string => !!s))];
  const lex = await getLexShort(supabase, strongs);
  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, undefined);

  return (
    <>
      <StudyTabs v2={flagOn(ctx, "study.library_v2")} reader />
      <ReaderView
        key={`${ref.book}-${ref.chapter}`}
        refNow={ref}
        verses={verses}
        tagged={tagged.length > 0}
        original={original}
        lex={lex}
        textError={textError}
        editor={{
          sermons,
          series,
          services: services.map((s) => ({ id: s.id, name: s.name })),
          campuses,
          activeCampus,
          locale: profRes.data?.locale ?? "pt-BR",
        }}
      />
    </>
  );
}
```

Obs.: conferir a assinatura de `resolveActiveCampus` em `src/lib/campus.ts`; se o 2º parâmetro não aceitar `undefined`, passar `null` ou `""` conforme o tipo.

- [ ] **Step 4: Seletor de capítulo**

`src/features/study/components/reader/ChapterPicker.tsx`:

```tsx
"use client";

// "João 1 ▾": popover ancorado no título com busca de livro, grade de capítulos e 3
// recentes. Substitui uma coluna fixa de livros (usada uma vez por sessão, não merece
// espaço permanente).
import { useEffect, useMemo, useRef, useState } from "react";
import { BOOKS, normToken } from "@/lib/bible/books";
import { RECENT_KEY, chapterCount, chapterLabel, pushRecent, type ChapterRef } from "../../reader";
import styles from "./reader.module.css";

function readRecent(): ChapterRef[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as ChapterRef[]).filter((r) => typeof r.book === "string" && typeof r.chapter === "number") : [];
  } catch {
    return [];
  }
}

export function ChapterPicker({ current, onPick }: { current: ChapterRef; onPick: (r: ChapterRef) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [book, setBook] = useState(current.book);
  const [recent, setRecent] = useState<ChapterRef[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = pushRecent(readRecent(), current);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento bloqueado: recentes só nesta visita */
    }
  }, [current]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent): void {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const books = useMemo(() => {
    const t = normToken(q);
    return t ? BOOKS.filter((b) => normToken(b.pt).includes(t) || b.abbr.some((a) => normToken(a) === t)) : BOOKS;
  }, [q]);

  function pick(r: ChapterRef): void {
    setOpen(false);
    setQ("");
    onPick(r);
  }

  return (
    <div className={styles.pickWrap} ref={boxRef}>
      <button type="button" className={styles.pickBtn} aria-expanded={open} onClick={() => { setBook(current.book); setOpen((o) => !o); }}>
        {chapterLabel(current)} <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div className={styles.picker} role="dialog" aria-label="Escolher capítulo">
          <input className={styles.pickSearch} placeholder="Buscar livro…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className={styles.pickCols}>
            <ul className={styles.pickBooks}>
              {books.map((b) => (
                <li key={b.code}>
                  <button type="button" className={b.code === book ? styles.pickOn : undefined} onClick={() => setBook(b.code)}>{b.pt}</button>
                </li>
              ))}
            </ul>
            <div className={styles.pickGrid}>
              {Array.from({ length: chapterCount(book) }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => pick({ book, chapter: n })}>{n}</button>
              ))}
            </div>
          </div>
          {recent.length > 1 ? (
            <div className={styles.pickRecent}>
              <span>Recentes</span>
              {recent.slice(1).map((r) => (
                <button key={`${r.book}-${r.chapter}`} type="button" className="link" onClick={() => pick(r)}>{chapterLabel(r)}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: `ReaderView` (texto, barra, capítulos; chave e balão ficam para a Task 5)**

`src/features/study/components/reader/ReaderView.tsx`:

```tsx
"use client";

// Tela de leitura (spec 07). Esta versão: barra, texto do capítulo, anterior/próximo e
// teclado. A Task 5 acrescenta chave Interlinear, balão e modo Original; as Tasks 6-8,
// a área de trabalho.
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Sermon, Series } from "../../types";
import { LAST_READ_KEY, adjacentChapter, chapterLabel, type ChapterRef, type LexShort, type OrigWord, type ReaderVerse } from "../../reader";
import { ChapterPicker } from "./ChapterPicker";
import styles from "./reader.module.css";

export interface EditorData {
  sermons: Sermon[];
  series: Series[];
  services: { id: string; name: string }[];
  campuses: string[];
  activeCampus: string;
  locale: string;
}

export function ReaderView({
  refNow,
  verses,
  textError,
}: {
  refNow: ChapterRef;
  verses: ReaderVerse[];
  tagged: boolean;
  original: OrigWord[];
  lex: Record<string, LexShort>;
  textError: string;
  editor: EditorData;
}) {
  const router = useRouter();
  const prev = adjacentChapter(refNow, -1);
  const next = adjacentChapter(refNow, 1);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(refNow));
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }, [refNow]);

  const go = useCallback((r: ChapterRef | null): void => {
    if (r) router.push(`/study/bible/${r.book}/${r.chapter}`);
  }, [router]);

  // ← → trocam de capítulo. Sem animação (ação de teclado, repetida). Ignora digitação.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next]);

  return (
    <div className={styles.reader}>
      <div className={styles.main}>
        <div className={styles.bar}>
          <ChapterPicker current={refNow} onPick={go} />
        </div>
        <article className={styles.text} lang="pt-BR" data-testid="reader-text">
          <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
          {textError ? <p className={styles.muted}>{textError}</p> : null}
          <p className={styles.para}>
            <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
            {verses.map((v) => (
              <span key={v.n}>
                <sup className={styles.vnumPlain}>{v.n}</sup>
                {v.spans.map((s, i) => <span key={i}>{s.text}</span>)}{" "}
              </span>
            ))}
          </p>
          <p className={styles.attrib}>Bíblia Livre (BLIVRE), CC BY 4.0</p>
        </article>
        <nav className={styles.chapNav} aria-label="Capítulos">
          {prev ? <button type="button" className="link" onClick={() => go(prev)}>‹ {chapterLabel(prev)}</button> : <span />}
          {next ? <button type="button" className="link" onClick={() => go(next)}>{chapterLabel(next)} ›</button> : <span />}
        </nav>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: CSS da tela (usado por todas as tarefas seguintes)**

`src/features/study/components/reader/reader.module.css`:

```css
/* Tela de leitura (spec 07). Tokens do app; nada de cor solta além da marca via --blue. */
.reader { display: grid; grid-template-columns: minmax(0, 1fr); min-height: calc(100dvh - 140px); }
.withPane { grid-template-columns: minmax(0, 1fr) minmax(340px, 44%); }
.main { min-width: 0; }
.muted { color: var(--text-2); font-family: var(--font-ui); font-size: var(--t-13); }

.bar { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: var(--s-3); padding: var(--s-2) var(--s-4); background: var(--bg); border-bottom: 1px solid var(--border); font-family: var(--font-ui); }
.sep { width: 1px; height: 16px; background: var(--border); }
.toggle { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: var(--t-13); font-weight: 600; color: var(--text); cursor: pointer; }

.pickWrap { position: relative; }
.pickBtn { font: 600 var(--t-15)/1 var(--font-ui); color: var(--text); background: none; border: 0; padding: 8px 10px; border-radius: var(--r-6); cursor: pointer; }
.pickBtn:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) { .pickBtn:hover { background: var(--surface-2); } }
.picker { position: absolute; top: calc(100% + 6px); left: 0; z-index: 20; width: min(560px, calc(100vw - 32px)); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-14); box-shadow: var(--e-2); padding: var(--s-3); transform-origin: top left; animation: popIn 150ms cubic-bezier(0.23, 1, 0.32, 1); }
.pickSearch { width: 100%; margin-bottom: var(--s-2); }
.pickCols { display: grid; grid-template-columns: 180px 1fr; gap: var(--s-3); max-height: 320px; }
.pickBooks { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
.pickBooks button { width: 100%; text-align: left; background: none; border: 0; padding: 6px 8px; border-radius: var(--r-6); color: var(--text); font: var(--t-13)/1.3 var(--font-ui); cursor: pointer; }
.pickOn { background: var(--surface-2) !important; font-weight: 600 !important; }
.pickGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 4px; align-content: start; overflow-y: auto; }
.pickGrid button { height: 36px; border: 1px solid var(--border); background: var(--surface); border-radius: var(--r-6); color: var(--text); font: var(--t-13)/1 var(--font-ui); cursor: pointer; }
.pickRecent { display: flex; flex-wrap: wrap; gap: var(--s-2); align-items: center; margin-top: var(--s-3); font: var(--t-11)/1.4 var(--font-ui); color: var(--text-2); }

.text { max-width: 38rem; margin: 0 auto; padding: var(--s-6) var(--s-4) var(--s-6); font-family: Georgia, "Times New Roman", serif; font-size: 1.125rem; line-height: 1.85; color: var(--text); }
.eyebrow { font: 600 var(--t-11)/1.4 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-2); margin-bottom: var(--s-4); }
.para { margin: 0; }
.dropcap { float: left; font-size: 3.4em; line-height: 0.85; margin: 0.06em 0.14em 0 0; }
.vnumPlain, .vnum { font: 600 0.62em/1 var(--font-ui); color: var(--blue); vertical-align: super; padding: 0 3px 0 6px; }
.vnum { background: none; border: 0; cursor: pointer; }
.word { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; border-radius: 3px; text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 0.22em; text-decoration-color: color-mix(in srgb, var(--blue) 35%, transparent); }
.hit { background: color-mix(in srgb, var(--blue) 12%, transparent); text-decoration-color: var(--blue); }
@media (hover: hover) and (pointer: fine) { .word:hover { background: color-mix(in srgb, var(--blue) 8%, transparent); } }
.attrib { font: var(--t-11)/1.4 var(--font-ui); color: var(--text-2); margin-top: var(--s-6); }
.chapNav { display: flex; justify-content: space-between; max-width: 38rem; margin: 0 auto var(--s-8); padding: 0 var(--s-4); font-family: var(--font-ui); }

/* Modo Original */
.il { display: flex; flex-wrap: wrap; gap: 4px 6px; margin: 0 0 var(--s-4); }
.ilVerse { font: 600 var(--t-11)/1 var(--font-ui); color: var(--blue); align-self: center; margin-right: 4px; }
.ilw { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 8px; border-radius: var(--r-6); border: 1px solid transparent; background: none; cursor: pointer; color: var(--text); }
.ilw.hit { border-color: color-mix(in srgb, var(--blue) 30%, transparent); }
@media (hover: hover) and (pointer: fine) { .ilw:hover { background: var(--surface-2); } }
.ilSurface { font-family: Georgia, "Times New Roman", serif; font-size: 1.2rem; }
.ilTr { font: var(--t-11)/1.2 var(--font-ui); color: var(--text-2); }
.ilGloss { font: var(--t-13)/1.2 var(--font-ui); color: var(--blue); }

/* Balão */
.pop { position: fixed; z-index: 60; width: 264px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-14); box-shadow: var(--e-2); padding: var(--s-3) var(--s-4); font-family: var(--font-ui); transform-origin: top left; animation: popIn 150ms cubic-bezier(0.23, 1, 0.32, 1); }
.popHead { display: flex; align-items: baseline; gap: 8px; }
.popLemma { font-family: Georgia, "Times New Roman", serif; font-size: 1.35rem; color: var(--text); }
.popMeta { font-size: var(--t-11); color: var(--text-2); }
.popClose { margin-left: auto; background: none; border: 0; color: var(--text-2); font-size: 18px; cursor: pointer; }
.popGloss { margin: 6px 0 10px; font-size: var(--t-13); color: var(--text); line-height: 1.45; }
.popActions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

/* Área de trabalho */
.pane { position: sticky; top: 0; height: calc(100dvh - 140px); display: flex; flex-direction: column; background: var(--surface); border-left: 1px solid var(--border); animation: paneIn var(--dur-panel) var(--ease); }
.paneOut { animation: paneOut var(--dur-micro) var(--ease) forwards; }
.grab { display: none; }
.tabs { display: flex; align-items: flex-end; gap: 2px; padding: 6px 8px 0; border-bottom: 1px solid var(--border); overflow-x: auto; font-family: var(--font-ui); }
.tab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid transparent; border-bottom: 0; border-radius: var(--r-6) var(--r-6) 0 0; background: none; color: var(--text-2); font-size: var(--t-13); white-space: nowrap; cursor: pointer; }
.tabOn { background: var(--bg); color: var(--text); font-weight: 600; border-color: var(--border); margin-bottom: -1px; }
.tabX { color: var(--text-2); font-size: 14px; line-height: 1; }
.tabAdd { margin-left: 4px; }
.addMenu { position: absolute; z-index: 10; margin-top: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-10); box-shadow: var(--e-2); padding: 4px; display: flex; flex-direction: column; }
.addMenu button { text-align: left; background: none; border: 0; padding: 8px 12px; border-radius: var(--r-6); color: var(--text); font: var(--t-13)/1.2 var(--font-ui); cursor: pointer; }
.body { flex: 1; overflow-y: auto; padding: var(--s-4); font-family: var(--font-ui); color: var(--text); }
.seg { display: inline-flex; gap: 2px; padding: 2px; background: var(--surface-2); border-radius: var(--r-6); margin: var(--s-2) 0 var(--s-3); }
.seg button { border: 0; background: none; padding: 5px 12px; border-radius: 5px; color: var(--text-2); font: var(--t-13)/1 var(--font-ui); cursor: pointer; }
.seg .segOn { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: var(--e-1); }
.occBook { display: flex; justify-content: space-between; width: 100%; padding: 8px 4px; background: none; border: 0; border-bottom: 1px solid var(--border); color: var(--text); font: var(--t-13)/1.2 var(--font-ui); cursor: pointer; }
.occChaps { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; padding: 8px 0; }
.occChaps button { text-align: left; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--r-6); background: var(--surface); color: var(--text); font: var(--t-13)/1.3 var(--font-ui); cursor: pointer; }

@keyframes popIn { from { opacity: 0; transform: scale(0.96); } }
@keyframes paneIn { from { opacity: 0; transform: translateX(24px); } }
@keyframes paneOut { to { opacity: 0; transform: translateX(24px); } }
@keyframes sheetIn { from { transform: translateY(100%); } }
@keyframes sheetOut { to { transform: translateY(100%); } }
@keyframes fadeIn { from { opacity: 0; } }

@media (max-width: 767px) {
  .withPane { grid-template-columns: minmax(0, 1fr); }
  .pane { position: fixed; left: 0; right: 0; bottom: 0; top: auto; height: 55dvh; z-index: 55; border-left: 0; border-top: 1px solid var(--border); border-radius: var(--r-20) var(--r-20) 0 0; box-shadow: var(--e-2); animation-name: sheetIn; transition: height var(--dur-panel) var(--ease); }
  .paneOut { animation-name: sheetOut; }
  .full { height: 92dvh; }
  .grab { display: block; width: 100%; padding: 10px 0 6px; background: none; border: 0; touch-action: none; cursor: grab; }
  .grab::before { content: ""; display: block; width: 36px; height: 4px; margin: 0 auto; border-radius: 9px; background: var(--border); }
  .pickCols { grid-template-columns: 1fr; max-height: 60dvh; }
}

@media (prefers-reduced-motion: reduce) {
  .pop, .picker, .pane { animation: fadeIn var(--dur-micro) ease; }
  .paneOut { animation: none; opacity: 0; }
  .pane { transition: none; }
}
```

- [ ] **Step 7: Verificar**

Run: `npm run typecheck && npm run lint && npx vitest run src/features/study`
Expected: tudo verde.

Ligar a flag só para a org de teste (painel `/admin` → Flags → `study.reader` → "Só igrejas escolhidas" + override da org) e abrir o preview (`preview_start` com o dev server). Conferir por `get_page_text` em `/study/bible/GEN/1` e `/study/bible/JHN/1`: texto aparece, "‹ Lucas 24" e "João 2 ›" em João 1, o seletor abre e navega. Lembrete da memória: o browser pane pode não hidratar React 19; verificar pelo HTML do SSR e, se preciso, interação no navegador do dono.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/study" src/features/study/components/reader src/features/study/components/StudyTabs.tsx
git commit -m "feat(study): rota /study/bible com texto do capítulo e seletor"
```

---

### Task 5: Chave Interlinear, balão da palavra e modo Original

**Files:**
- Create: `src/features/study/components/reader/WordPopover.tsx`
- Modify: `src/features/study/components/reader/ReaderView.tsx`

**Interfaces:**
- Consumes: `glossOf`, `isHebrew`, `groupOriginal`, `LexShort`, `OrigWord` (Task 2); `Select` (`@/components/shared/Select`).
- Produces: `interface PopoverState { strong: string; verse: number; key: string; top: number; left: number }`; `WordPopover({ state, lex, canSendToSermon, onDetails, onNote, onSermon, onClose })`. Em `ReaderView`, handlers `onDetails`/`onNote`/`onSermon` viram no-ops até a Task 6/8 (a Task 6 os liga).

- [ ] **Step 1: Balão**

`src/features/study/components/reader/WordPopover.tsx`:

```tsx
"use client";

// Balão da palavra: ancorado no trecho tocado (origem do scale no canto do balão mais
// perto da palavra). Fecha com Esc, clique fora, rolagem ou ×.
import { useEffect, useRef } from "react";
import { glossOf, isHebrew, type LexShort } from "../../reader";
import styles from "./reader.module.css";

export interface PopoverState {
  strong: string;
  verse: number;
  key: string; // identifica o trecho tocado (para o realce)
  top: number;
  left: number;
}

const WIDTH = 264;

// Posição a partir do retângulo da palavra, sem vazar da janela.
export function popoverAt(rect: DOMRect, strong: string, verse: number, key: string): PopoverState {
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - WIDTH - 12);
  return { strong, verse, key, top: rect.bottom + 8, left };
}

export function WordPopover({
  state,
  lex,
  canSendToSermon,
  onDetails,
  onNote,
  onSermon,
  onClose,
}: {
  state: PopoverState;
  lex: Record<string, LexShort>;
  canSendToSermon: boolean;
  onDetails: () => void;
  onNote: () => void;
  onSermon: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const l = lex[state.strong];
  const heb = isHebrew(state.strong);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: PointerEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onClose, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onClose);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="dialog" aria-label={`Palavra original ${l?.lemma ?? state.strong}`} className={styles.pop} style={{ top: state.top, left: state.left }} data-testid="word-popover">
      <div className={styles.popHead}>
        <span className={styles.popLemma} lang={heb ? "he" : "grc"} dir={heb ? "rtl" : undefined}>{l?.lemma ?? state.strong}</span>
        <span className={styles.popMeta}>{[l?.translit, state.strong].filter(Boolean).join(" · ")}</span>
        <button type="button" className={styles.popClose} aria-label="Fechar" onClick={onClose}>×</button>
      </div>
      <p className={styles.popGloss}>{glossOf(l) || "Sem sentido curto cadastrado para esta palavra."}</p>
      <div className={styles.popActions}>
        <button type="button" className="btn" onClick={onDetails}>Ver detalhes</button>
        <button type="button" className="link" onClick={onNote}>Anotar</button>
        {canSendToSermon ? <button type="button" className="link" onClick={onSermon}>Levar pro sermão</button> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Chave, trechos tocáveis e modo Original no `ReaderView`**

Mudanças em `ReaderView.tsx` (mostrado o arquivo final desta tarefa, para não haver ambiguidade):

```tsx
"use client";

// Tela de leitura (spec 07): barra, texto, chave Interlinear, balão, modo Original.
// A área de trabalho entra na Task 6.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import type { Sermon, Series } from "../../types";
import {
  LAST_READ_KEY,
  adjacentChapter,
  chapterLabel,
  glossOf,
  groupOriginal,
  type ChapterRef,
  type LexShort,
  type OrigWord,
  type ReaderVerse,
  type Span,
} from "../../reader";
import { ChapterPicker } from "./ChapterPicker";
import { WordPopover, popoverAt, type PopoverState } from "./WordPopover";
import styles from "./reader.module.css";

export interface EditorData {
  sermons: Sermon[];
  series: Series[];
  services: { id: string; name: string }[];
  campuses: string[];
  activeCampus: string;
  locale: string;
}

type Mode = "bible" | "original";
const TOGGLE_KEY = "tally.reader.interlinear";

export function ReaderView({
  refNow,
  verses,
  tagged,
  original,
  lex,
  textError,
}: {
  refNow: ChapterRef;
  verses: ReaderVerse[];
  tagged: boolean;
  original: OrigWord[];
  lex: Record<string, LexShort>;
  textError: string;
  editor: EditorData;
}) {
  const router = useRouter();
  const prev = adjacentChapter(refNow, -1);
  const next = adjacentChapter(refNow, 1);
  const [mode, setMode] = useState<Mode>("bible");
  const [interlinear, setInterlinear] = useState(false);
  const [pop, setPop] = useState<PopoverState | null>(null);
  const closePop = useCallback((): void => setPop(null), []);

  useEffect(() => {
    try {
      setInterlinear(localStorage.getItem(TOGGLE_KEY) === "1");
    } catch {
      /* sem armazenamento: começa desligada */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(refNow));
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }, [refNow]);

  function toggleInterlinear(): void {
    setPop(null);
    setInterlinear((v) => {
      try {
        localStorage.setItem(TOGGLE_KEY, v ? "0" : "1");
      } catch {
        /* preferência só nesta visita */
      }
      return !v;
    });
  }

  const go = useCallback((r: ChapterRef | null): void => {
    if (r) router.push(`/study/bible/${r.book}/${r.chapter}`);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next]);

  const showWords = tagged && interlinear && mode === "bible";

  function renderSpan(s: Span, verse: number, i: number): ReactNode {
    const strong = s.strong;
    if (!showWords || !strong) return <span key={i}>{s.text}</span>;
    const key = `${verse}:${i}`;
    return (
      <button
        key={i}
        type="button"
        data-strong={strong}
        className={`${styles.word} ${pop?.key === key ? styles.hit : ""}`}
        onClick={(e) => setPop(popoverAt(e.currentTarget.getBoundingClientRect(), strong, verse, key))}
      >
        {s.text}
      </button>
    );
  }

  const byVerse = mode === "original" ? groupOriginal(original) : [];

  return (
    <div className={styles.reader}>
      <div className={styles.main}>
        <div className={styles.bar}>
          <ChapterPicker current={refNow} onPick={go} />
          <span className={styles.sep} aria-hidden />
          <Select compact value={mode} aria-label="Modo de leitura" onChange={(e) => { setPop(null); setMode(e.target.value === "original" ? "original" : "bible"); }}>
            <option value="bible">Bíblia</option>
            <option value="original">Original</option>
          </Select>
          {tagged && mode === "bible" ? (
            <label className={styles.toggle}>
              <input type="checkbox" role="switch" checked={interlinear} onChange={toggleInterlinear} data-testid="interlinear-toggle" />
              Interlinear
            </label>
          ) : null}
        </div>

        {mode === "bible" ? (
          <article className={styles.text} lang="pt-BR" data-testid="reader-text">
            <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
            {textError ? <p className={styles.muted}>{textError}</p> : null}
            <p className={styles.para}>
              <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
              {verses.map((v) => (
                <span key={v.n}>
                  <sup className={styles.vnumPlain}>{v.n}</sup>
                  {v.spans.map((s, i) => renderSpan(s, v.n, i))}{" "}
                </span>
              ))}
            </p>
            <p className={styles.attrib}>Bíblia Livre (BLIVRE), CC BY 4.0</p>
          </article>
        ) : (
          <article className={styles.text} data-testid="reader-original">
            <div className={styles.eyebrow}>{chapterLabel(refNow)} · texto original</div>
            {byVerse.length === 0 ? <p className={styles.muted}>O texto original deste capítulo ainda não está no Tally.</p> : null}
            {byVerse.map((v) => (
              <div key={v.n} className={styles.il} dir={v.words[0]?.lang === "hbo" ? "rtl" : "ltr"}>
                <span className={styles.ilVerse}>{v.n}</span>
                {v.words.map((w) => {
                  const strong = w.strong;
                  const key = `o${v.n}:${w.position}`;
                  return (
                    <button
                      key={w.position}
                      type="button"
                      data-strong={strong ?? undefined}
                      disabled={!strong}
                      className={`${styles.ilw} ${pop?.key === key ? styles.hit : ""}`}
                      onClick={(e) => { if (strong) setPop(popoverAt(e.currentTarget.getBoundingClientRect(), strong, v.n, key)); }}
                    >
                      <span className={styles.ilSurface} lang={w.lang === "hbo" ? "he" : "grc"}>{w.surface}</span>
                      <span className={styles.ilTr}>{w.translit}</span>
                      <span className={styles.ilGloss}>{strong ? glossOf(lex[strong]) : ""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <p className={styles.attrib}>Texto original e léxico: STEPBible (CC BY 4.0)</p>
          </article>
        )}

        <nav className={styles.chapNav} aria-label="Capítulos">
          {prev ? <button type="button" className="link" onClick={() => go(prev)}>‹ {chapterLabel(prev)}</button> : <span />}
          {next ? <button type="button" className="link" onClick={() => go(next)}>{chapterLabel(next)} ›</button> : <span />}
        </nav>
      </div>

      {pop ? (
        <WordPopover state={pop} lex={lex} canSendToSermon={false} onDetails={closePop} onNote={closePop} onSermon={closePop} onClose={closePop} />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: verde. No preview, em `/study/bible/JHN/1` modo Original: blocos gregos com glosa; tocar num bloco abre o balão (a chave só aparece depois da carga da Tarefa 9).

- [ ] **Step 4: Commit**

```bash
git add src/features/study/components/reader
git commit -m "feat(study): chave Interlinear, balão da palavra e modo Original"
```

---

### Task 6: Área de trabalho com abas, aba Palavra e gaveta no celular

**Files:**
- Create: `src/features/study/components/reader/WorkspacePane.tsx`
- Create: `src/features/study/components/reader/WordTab.tsx`
- Modify: `src/features/study/components/reader/ReaderView.tsx`

**Interfaces:**
- Consumes: `Workspace`, `WsTab`, `tabKey`, `openTab`, `closeTab`, `EMPTY_WS`, `sheetAfterDrag`, `rubberband`, `groupOccurrences`, `glossOf` (Task 2); `createClient` (`@/lib/supabase/client`).
- Produces: `WorkspacePane({ ws, lex, onActivate, onCloseTab, onCloseAll, renderTab, addable, onAdd })` onde `renderTab: (t: WsTab) => ReactNode` e `addable: { kind: "notes" | "sermon"; label: string }[]`; `WordTab({ strong, lex, onGo })`. As Tasks 7 e 8 só acrescentam casos em `renderTab` e itens em `addable`.

- [ ] **Step 1: Aba Palavra**

`src/features/study/components/reader/WordTab.tsx`:

```tsx
"use client";

// Aba "Palavra": Definição (português quando houver, senão o verbete inglês resumido)
// e Ocorrências (livro → capítulos → toque navega). Leitura direta das tabelas globais.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { glossOf, groupOccurrences, isHebrew, type ChapterRef, type LexShort, type OccBook } from "../../reader";
import styles from "./reader.module.css";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ok"; data: T };
const EN_MAX = 700;

export function WordTab({ strong, lex, onGo }: { strong: string; lex: Record<string, LexShort>; onGo: (r: ChapterRef) => void }) {
  const l = lex[strong];
  const heb = isHebrew(strong);
  const [seg, setSeg] = useState<"def" | "occ">("def");
  const [def, setDef] = useState<Load<{ pt: string | null; en: string | null }>>({ status: "loading" });
  const [occ, setOcc] = useState<Load<OccBook[]> | null>(null);
  const [openBook, setOpenBook] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void createClient()
      .from("strongs_lexicon")
      .select("definition_pt, definition")
      .eq("strong", strong)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        setDef(error ? { status: "error" } : { status: "ok", data: { pt: data?.definition_pt ?? null, en: data?.definition ?? null } });
      });
    return () => {
      alive = false;
    };
  }, [strong]);

  useEffect(() => {
    if (seg !== "occ" || occ) return;
    let alive = true;
    setOcc({ status: "loading" });
    void createClient()
      .rpc("strong_occurrences", { p_strong: strong })
      .then(({ data, error }) => {
        if (!alive) return;
        setOcc(error ? { status: "error" } : { status: "ok", data: groupOccurrences(data ?? []) });
      });
    return () => {
      alive = false;
    };
  }, [seg, strong, occ]);

  const total = occ?.status === "ok" ? occ.data.reduce((s, b) => s + b.total, 0) : null;
  const citation = `STEPBible, léxico ${heb ? "hebraico" : "grego"} (CC BY 4.0), verbete ${strong}${def.status === "ok" && def.data.pt ? ", tradução Tally" : ""}.`;

  async function copyCitation(): Promise<void> {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div data-testid="word-tab">
      <div className="st-lemma" style={{ fontFamily: "Georgia, serif", fontSize: 26 }} lang={heb ? "he" : "grc"} dir={heb ? "rtl" : undefined}>{l?.lemma ?? strong}</div>
      <div className={styles.muted}>{[l?.translit, glossOf(l), strong].filter(Boolean).join(" · ")}</div>
      <div className={styles.seg} role="tablist">
        <button type="button" role="tab" aria-selected={seg === "def"} className={seg === "def" ? styles.segOn : undefined} onClick={() => setSeg("def")}>Definição</button>
        <button type="button" role="tab" aria-selected={seg === "occ"} className={seg === "occ" ? styles.segOn : undefined} onClick={() => setSeg("occ")}>
          Ocorrências{total != null ? ` ${total}` : ""}
        </button>
      </div>

      {seg === "def" ? (
        def.status === "loading" ? <p className={styles.muted}>Carregando…</p>
        : def.status === "error" ? <p className={styles.muted}>Não consegui carregar a definição agora.</p>
        : (
          <>
            {def.data.pt ? <p>{def.data.pt}</p> : def.data.en ? (
              <p><span className={styles.muted}>(verbete em inglês) </span>{def.data.en.length > EN_MAX ? def.data.en.slice(0, EN_MAX) + "…" : def.data.en}</p>
            ) : <p className={styles.muted}>Sem definição cadastrada.</p>}
            <p className={styles.muted}>
              Fonte: léxico STEPBible (CC BY 4.0){def.data.pt ? ", tradução Tally" : ""} ·{" "}
              <button type="button" className="link" onClick={copyCitation}>{copied ? "Citação copiada" : "Citar"}</button>
            </p>
          </>
        )
      ) : occ == null || occ.status === "loading" ? <p className={styles.muted}>Carregando…</p>
      : occ.status === "error" ? <p className={styles.muted}>Não consegui carregar as ocorrências agora.</p>
      : (
        <div>
          {occ.data.map((b) => (
            <div key={b.book}>
              <button type="button" className={styles.occBook} aria-expanded={openBook === b.book} onClick={() => setOpenBook((o) => (o === b.book ? "" : b.book))}>
                <span>{openBook === b.book ? "▾" : "›"} {b.name}</span><span className={styles.muted}>{b.total}</span>
              </button>
              {openBook === b.book ? (
                <div className={styles.occChaps}>
                  {b.chapters.map((c) => (
                    <button key={c.chapter} type="button" onClick={() => onGo({ book: b.book, chapter: c.chapter })}>
                      Capítulo {c.chapter}<br /><span className={styles.muted}>{c.n} {c.n === 1 ? "ocorrência" : "ocorrências"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Remover o `className="st-lemma"` se o lint acusar classe global inexistente (o estilo inline cobre).

- [ ] **Step 2: Painel com abas e gaveta**

`src/features/study/components/reader/WorkspacePane.tsx`:

```tsx
"use client";

// Área de trabalho (spec 07): abas à direita no desktop, gaveta no celular. Todas as
// abas abertas ficam MONTADAS (só a ativa aparece) para não perder estado — o editor de
// sermão não pode desmontar no meio de um autosave.
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { rubberband, sheetAfterDrag, tabKey, type SheetState, type Workspace, type WsTab, type LexShort } from "../../reader";
import styles from "./reader.module.css";

function tabLabel(t: WsTab, lex: Record<string, LexShort>): string {
  if (t.kind === "word") return lex[t.strong]?.lemma ?? t.strong;
  if (t.kind === "verse") return `v. ${t.verse}`;
  return t.kind === "notes" ? "Notas" : "Sermão";
}

export function WorkspacePane({
  ws,
  lex,
  closing,
  onActivate,
  onCloseTab,
  onCloseAll,
  renderTab,
  addable,
  onAdd,
  verseLabel,
}: {
  ws: Workspace;
  lex: Record<string, LexShort>;
  closing: boolean;
  onActivate: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseAll: () => void;
  renderTab: (t: WsTab) => ReactNode;
  addable: { kind: "notes" | "sermon"; label: string }[];
  onAdd: (kind: "notes" | "sermon") => void;
  verseLabel: (verse: number) => string;
}) {
  const [sheet, setSheet] = useState<SheetState>("half");
  const [addOpen, setAddOpen] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  function onDown(e: ReactPointerEvent<HTMLButtonElement>): void {
    if (drag.current) return; // ignora o 2º dedo
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: ReactPointerEvent<HTMLButtonElement>): void {
    const d = drag.current;
    const el = paneRef.current;
    if (!d || !el) return;
    d.dy = e.clientY - d.y;
    const shown = d.dy < 0 && sheet === "full" ? rubberband(d.dy, window.innerHeight) : d.dy;
    el.style.transform = `translateY(${shown}px)`;
  }
  function onUp(): void {
    const d = drag.current;
    const el = paneRef.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transform = "";
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    const nextState = sheetAfterDrag(sheet, d.dy, velocity);
    if (nextState === "closed") onCloseAll();
    else setSheet(nextState);
  }

  return (
    <aside ref={paneRef} className={`${styles.pane} ${sheet === "full" ? styles.full : ""} ${closing ? styles.paneOut : ""}`} aria-label="Área de trabalho" data-testid="workspace">
      <button type="button" className={styles.grab} aria-label="Arrastar gaveta" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      <div className={styles.tabs} role="tablist">
        {ws.tabs.map((t) => {
          const key = tabKey(t);
          const label = t.kind === "verse" ? verseLabel(t.verse) : tabLabel(t, lex);
          return (
            <span key={key} className={`${styles.tab} ${ws.active === key ? styles.tabOn : ""}`}>
              <button type="button" role="tab" aria-selected={ws.active === key} className="link" onClick={() => onActivate(key)}>{label}</button>
              <button type="button" className={`link ${styles.tabX}`} aria-label={`Fechar ${label}`} onClick={() => onCloseTab(key)}>×</button>
            </span>
          );
        })}
        {addable.length ? (
          <span style={{ position: "relative" }}>
            <button type="button" className={`link ${styles.tabAdd}`} aria-label="Abrir aba" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}>＋</button>
            {addOpen ? (
              <div className={styles.addMenu}>
                {addable.map((a) => (
                  <button key={a.kind} type="button" onClick={() => { setAddOpen(false); onAdd(a.kind); }}>{a.label}</button>
                ))}
              </div>
            ) : null}
          </span>
        ) : null}
      </div>
      {ws.tabs.map((t) => (
        <div key={tabKey(t)} className={styles.body} role="tabpanel" hidden={ws.active !== tabKey(t)}>
          {renderTab(t)}
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 3: Ligar a área de trabalho no `ReaderView`**

Em `ReaderView.tsx`:

1. Imports: acrescentar `EMPTY_WS, closeTab, openTab, type Workspace, type WsTab` de `../../reader`; `import { WorkspacePane } from "./WorkspacePane";` e `import { WordTab } from "./WordTab";`.
2. Estado, depois de `const closePop = …`:

```tsx
  const [ws, setWs] = useState<Workspace>(EMPTY_WS);
  const [closing, setClosing] = useState(false);
  const open = useCallback((t: WsTab): void => {
    setPop(null);
    setClosing(false);
    setWs((w) => openTab(w, t));
  }, []);
  // Fechar tudo anima a saída (mesmo caminho da entrada) e só então desmonta.
  const closeAll = useCallback((): void => {
    setClosing(true);
    window.setTimeout(() => {
      setWs(EMPTY_WS);
      setClosing(false);
    }, 200);
  }, []);
  function closeOne(key: string): void {
    const nextWs = closeTab(ws, key);
    if (nextWs.tabs.length === 0) closeAll();
    else setWs(nextWs);
  }
  function renderTab(t: WsTab): ReactNode {
    if (t.kind === "word") return <WordTab strong={t.strong} lex={lex} onGo={go} />;
    return null;
  }
```

3. Raiz: `<div className={`${styles.reader} ${ws.tabs.length ? styles.withPane : ""}`}>`.
4. No balão: `onDetails={() => pop && open({ kind: "word", strong: pop.strong })}`.
5. Antes do fechamento da raiz, depois do balão:

```tsx
      {ws.tabs.length ? (
        <WorkspacePane
          ws={ws}
          lex={lex}
          closing={closing}
          onActivate={(key) => setWs((w) => ({ ...w, active: key }))}
          onCloseTab={closeOne}
          onCloseAll={closeAll}
          renderTab={renderTab}
          addable={[]}
          onAdd={() => undefined}
          verseLabel={(v) => `${chapterLabel(refNow)}:${v}`}
        />
      ) : null}
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npx vitest run src/features/study`
Expected: verde. No preview (modo Original): tocar num bloco → "Ver detalhes" → painel abre à direita com a aba; Ocorrências lista livros; tocar num capítulo navega. Em 375px (`resize_window` preset mobile) o painel vira gaveta; conferir o CSS computado `position: fixed` via `javascript_tool`.

- [ ] **Step 5: Commit**

```bash
git add src/features/study/components/reader
git commit -m "feat(study): área de trabalho em abas e aba Palavra"
```

---

### Task 7: Aba Versículo (lentes existentes) e aba Notas

**Files:**
- Modify: `src/features/study/components/BibleCompare.tsx:224-234` (props), `:795-806` (raiz), fim do arquivo
- Create: `src/features/study/components/reader/NotesTab.tsx`
- Modify: `src/features/study/components/reader/ReaderView.tsx`

**Interfaces:**
- Consumes: `listTextNotesAction(book: string, chapter: number)`, `saveTextNoteAction({ id?, book, chapter, verse_start, verse_end, body })`, `deleteTextNoteAction(id)` (`../../actions`), `TextNote` (`../../types`), `ScriptureRef` (`@/lib/bible/parse`).
- Produces: `BibleCompare` aceita `embedded?: boolean`; `NotesTab({ refNow, verse })`. Números de versículo viram botões que abrem `{ kind: "verse" }`.

- [ ] **Step 1: `BibleCompare` embutível**

Nas props (~l.224) acrescentar `embedded = false,` na desestruturação e `embedded?: boolean;` no tipo. Na raiz (~l.795) trocar:

```tsx
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`modal ${styles.cmp}`} onSubmit={(e) => e.preventDefault()}>
```

por:

```tsx
  const content = (
      <form className={embedded ? styles.cmpEmbedded : `modal ${styles.cmp}`} onSubmit={(e) => e.preventDefault()}>
```

e, dentro do cabeçalho, trocar o botão `×` por `{embedded ? null : (<button className="iconbtn" type="button" aria-label="Fechar" style={{ marginLeft: "auto" }} onClick={onClose}>×</button>)}`. No fim do arquivo trocar

```tsx
      </form>
    </div>
  );
}
```

por

```tsx
      </form>
  );
  return embedded ? content : (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {content}
    </div>
  );
}
```

Em `src/features/study/study.module.css` (versão commitada) acrescentar ao fim:

```css
/* BibleCompare dentro da área de trabalho da leitura (spec 07): sem cartão de modal. */
.cmpEmbedded { display: block; width: 100%; }
```

Run: `npm run typecheck`
Expected: verde. O editor de sermão continua abrindo o modal como antes (sem `embedded`).

- [ ] **Step 2: Aba Notas**

`src/features/study/components/reader/NotesTab.tsx`:

```tsx
"use client";

// Aba "Notas": notas da passagem aberta (study_text_notes, as mesmas da lente Notas).
// "Anotar" no balão chega aqui com o versículo já escolhido.
import { useEffect, useState } from "react";
import { deleteTextNoteAction, listTextNotesAction, saveTextNoteAction } from "../../actions";
import type { TextNote } from "../../types";
import { chapterLabel, type ChapterRef } from "../../reader";
import styles from "./reader.module.css";

export function NotesTab({ refNow, verse }: { refNow: ChapterRef; verse: number | null }) {
  const [items, setItems] = useState<TextNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    void listTextNotesAction(refNow.book, refNow.chapter).then((r) => {
      if (!alive) return;
      if (r.success) setItems(r.data);
      else { setItems([]); setErr(r.message || "Não consegui carregar as notas."); }
    });
    return () => {
      alive = false;
    };
  }, [refNow.book, refNow.chapter]);

  async function save(): Promise<void> {
    setBusy(true);
    setErr("");
    const r = await saveTextNoteAction({ book: refNow.book, chapter: refNow.chapter, verse_start: verse, verse_end: null, body: draft });
    setBusy(false);
    if (!r.success) { setErr(r.message || "Não consegui guardar a nota."); return; }
    setItems((l) => [r.data, ...(l ?? [])]);
    setDraft("");
  }

  async function remove(id: string): Promise<void> {
    const r = await deleteTextNoteAction(id);
    if (r.success) setItems((l) => (l ?? []).filter((n) => n.id !== id));
    else setErr(r.message || "Não consegui excluir a nota.");
  }

  const where = verse ? `${chapterLabel(refNow)}:${verse}` : chapterLabel(refNow);
  return (
    <div data-testid="notes-tab">
      <label className={styles.muted} htmlFor="reader-note">Nova nota · {where}</label>
      <textarea id="reader-note" rows={3} style={{ width: "100%" }} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "6px 0 16px" }}>
        <button type="button" className="btn" disabled={busy || !draft.trim()} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        {err ? <span className={styles.muted}>{err}</span> : null}
      </div>
      {items == null ? <p className={styles.muted}>Carregando…</p> : items.length === 0 ? <p className={styles.muted}>Nenhuma nota neste capítulo ainda.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((n) => (
            <li key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div className={styles.muted}>{n.verse_start ? `${chapterLabel(refNow)}:${n.verse_start}` : chapterLabel(refNow)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
              <button type="button" className="link" onClick={() => remove(n.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Conferir o formato de `ActionResult` em `src/features/study/actions.ts` (`success`/`data`/`message`); se o campo de erro tiver outro nome, ajustar os três usos.

- [ ] **Step 3: Ligar no `ReaderView`**

1. Imports: `import { BibleCompare } from "../BibleCompare";`, `import { NotesTab } from "./NotesTab";`, `import { bookName } from "@/lib/bible/books";`.
2. Estado: `const [noteVerse, setNoteVerse] = useState<number | null>(null);`.
3. Em `renderTab`, antes do `return null`:

```tsx
    if (t.kind === "verse") {
      const r = { book: refNow.book, chapter: refNow.chapter, verse_start: t.verse, verse_end: null, reference: `${bookName(refNow.book)} ${refNow.chapter}:${t.verse}` };
      return <BibleCompare embedded initialRef={r} locale={editor.locale} onClose={() => closeOne(tabKey(t))} />;
    }
    if (t.kind === "notes") return <NotesTab refNow={refNow} verse={noteVerse} />;
```

(acrescentar `tabKey` aos imports de `../../reader` e `editor` à desestruturação das props.)
4. No texto, trocar `<sup className={styles.vnumPlain}>{v.n}</sup>` por:

```tsx
                  <button type="button" className={styles.vnum} aria-label={`Estudar ${chapterLabel(refNow)}:${v.n}`} onClick={() => open({ kind: "verse", verse: v.n })}>{v.n}</button>
```

5. No balão: `onNote={() => { if (pop) { setNoteVerse(pop.verse); open({ kind: "notes" }); } }}`.
6. `addable={ws.tabs.some((t) => t.kind === "notes") ? [] : [{ kind: "notes", label: "Notas" }]}` e `onAdd={(k) => { if (k === "notes") { setNoteVerse(null); open({ kind: "notes" }); } }}`.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npx vitest run src/features/study`
Expected: verde. No preview: tocar no número do versículo abre "João 1:1" com Traduções/Referências/Contexto; "Anotar" abre Notas com "Nova nota · João 1:1"; guardar e excluir funcionam. Abrir um sermão em `/study/sermon/<id>` e conferir que o "Estudo do Texto" continua abrindo como modal (sem regressão).

- [ ] **Step 5: Commit**

```bash
git add src/features/study/components/BibleCompare.tsx src/features/study/study.module.css src/features/study/components/reader
git commit -m "feat(study): abas Versículo e Notas na leitura"
```

---

### Task 8: Aba Sermão e "Levar pro sermão"

**Files:**
- Modify: `src/features/study/components/SermonEditor.tsx:55-70` (props), `:160-165` (replaceState), `:228-235` (efeito de entrada)
- Create: `src/features/study/components/reader/SermonTab.tsx`
- Modify: `src/features/study/components/reader/ReaderView.tsx`

**Interfaces:**
- Consumes: `SermonEditor`, `DEFAULT_SECTION`, `buildKeywordBlock`, `type SectionKey` (`../../domain`), `EditorData` (Task 4).
- Produces: `SermonEditor` aceita `embedded?: boolean` e `incoming?: { block: string; section: SectionKey; seq: number } | null`; `SermonTab({ editor, incoming })`.

- [ ] **Step 1: `SermonEditor` recebe blocos de fora**

Na desestruturação das props acrescentar `embedded = false,` e `incoming = null,`; no tipo:

```ts
  embedded?: boolean;
  incoming?: { block: string; section: SectionKey; seq: number } | null;
```

No `replaceState` (~l.164): `if (!embedded) window.history.replaceState(null, "", `/study/sermon/${res.data.id}`);`.

Depois de `function addBlockToSection` (~l.235):

```tsx
  // Blocos vindos de fora (leitura, spec 07): cada `seq` novo entra uma vez.
  const lastSeq = useRef(0);
  useEffect(() => {
    if (!incoming || incoming.seq === lastSeq.current) return;
    lastSeq.current = incoming.seq;
    addBlockToSection(incoming.block, incoming.section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);
```

Run: `npm run typecheck`
Expected: verde; a página `/study/sermon/[id]` não muda (não passa as props novas).

- [ ] **Step 2: Aba Sermão**

`src/features/study/components/reader/SermonTab.tsx`:

```tsx
"use client";

// Aba "Sermão": escolher um sermão em andamento (ou começar um novo) e escrever ao lado
// do texto. O editor é o mesmo de /study/sermon, com autosave; `slot` só muda quando o
// pastor escolhe outro sermão, para o editor não remontar no meio da escrita.
import { useState } from "react";
import type { SectionKey } from "../../domain";
import { SermonEditor } from "../SermonEditor";
import type { EditorData } from "./ReaderView";
import styles from "./reader.module.css";

const OPEN = new Set(["draft", "preparing", "ready"]);

export function SermonTab({ editor, incoming }: { editor: EditorData; incoming: { block: string; section: SectionKey; seq: number } | null }) {
  const [pick, setPick] = useState<{ id: string | null; slot: number } | null>(null);
  const inProgress = editor.sermons.filter((s) => OPEN.has(s.status));

  if (!pick) {
    return (
      <div data-testid="sermon-picker">
        <button type="button" className="btn" onClick={() => setPick({ id: null, slot: Date.now() })}>Novo sermão</button>
        <p className={styles.muted} style={{ margin: "16px 0 6px" }}>Em andamento</p>
        {inProgress.length === 0 ? <p className={styles.muted}>Nenhum sermão em andamento.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {inProgress.map((s) => (
              <li key={s.id}>
                <button type="button" className="link" onClick={() => setPick({ id: s.id, slot: Date.now() })}>{s.title || "Sem título"}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const sermon = pick.id ? editor.sermons.find((s) => s.id === pick.id) ?? null : null;
  return (
    <div data-testid="sermon-tab">
      <button type="button" className="link" onClick={() => setPick(null)}>‹ Trocar sermão</button>
      <SermonEditor
        key={pick.slot}
        embedded
        incoming={incoming}
        sermon={sermon}
        series={editor.series}
        services={editor.services}
        campuses={editor.campuses}
        activeCampus={editor.activeCampus}
        locale={editor.locale}
      />
    </div>
  );
}
```

- [ ] **Step 3: Ligar no `ReaderView`**

1. Imports: `import { SermonTab } from "./SermonTab";` e `import { DEFAULT_SECTION, buildKeywordBlock, type SectionKey } from "../../domain";`.
2. Estado: `const [incoming, setIncoming] = useState<{ block: string; section: SectionKey; seq: number } | null>(null);` e `const sermonOpen = ws.tabs.some((t) => t.kind === "sermon");`.
3. Função:

```tsx
  function sendToSermon(strong: string, verse: number): void {
    const l = lex[strong];
    const block = `${chapterLabel(refNow)}:${verse} · ` + buildKeywordBlock({ lemma: l?.lemma || strong, strong, meaning: glossOf(l), occurrences: null });
    setIncoming((p) => ({ block, section: DEFAULT_SECTION, seq: (p?.seq ?? 0) + 1 }));
    open({ kind: "sermon" });
  }
```

4. `renderTab`: `if (t.kind === "sermon") return <SermonTab editor={editor} incoming={incoming} />;`. No `BibleCompare` da aba Versículo passar `onAddToSermon={sermonOpen ? (block, section) => setIncoming((p) => ({ block, section, seq: (p?.seq ?? 0) + 1 })) : undefined}`.
5. Balão: `canSendToSermon={sermonOpen}` e `onSermon={() => pop && sendToSermon(pop.strong, pop.verse)}`.
6. `addable`: montar a lista com "Notas" (se não aberta) e `{ kind: "sermon", label: "Sermão" }` (se não aberto); `onAdd` abre o `kind` pedido (`notes` zera `noteVerse`).

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npx vitest run src/features/study`
Expected: verde. No preview: "＋" → Sermão → escolher um sermão → tocar numa palavra → "Levar pro sermão" → o bloco "João 1:1 · λόγος (G3056) — palavra…" aparece no corpo e o status vira "Salvo". Trocar de aba e voltar: o texto digitado continua lá. Criar "Novo sermão" dentro da aba e conferir que a URL continua `/study/bible/...`.

- [ ] **Step 5: Commit**

```bash
git add src/features/study/components/SermonEditor.tsx src/features/study/components/reader
git commit -m "feat(study): aba Sermão e Levar pro sermão na leitura"
```

---

### Task 9: Dados — ligação português↔grego de João (Bíblia Livre)

**Files:**
- Create: `scripts/align/fetch-john.mjs`
- Create: `scripts/align/validate-alignment.mjs`
- Create: `scripts/align/ALIGN-PROMPT.md`
- Modify: `scripts/seed-original-text.mjs` (modos `tagged` e `lexpt`)
- Gera (não commitar): `scripts/align/work/` (acrescentar `scripts/align/work/` ao `.gitignore`)

**Interfaces:**
- Consumes: tabela `bible_tagged_words` (Task 1); `bible_original_tokens` (m34, `book='John'`); helloao `por_blj`.
- Produces: `bible_tagged_words` preenchida para `('por_blj','John', 1..21)`; o `ReaderView` passa a mostrar a chave em João.

- [ ] **Step 1: Buscar a entrada por capítulo**

`scripts/align/fetch-john.mjs`:

```js
// Monta a entrada da ligação de João: por versículo, o texto da Bíblia Livre (helloao,
// o MESMO parse da tela) e os tokens gregos (bible_original_tokens, leitura pública).
// Uso: node --env-file=.env.local scripts/align/fetch-john.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { versesFrom, verseText } from "../../src/lib/bible/helloao.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Rode com --env-file=.env.local");
const supabase = createClient(url, anon, { auth: { persistSession: false } });
fs.mkdirSync("scripts/align/work", { recursive: true });

for (let ch = 1; ch <= 21; ch++) {
  const r = await fetch(`https://bible.helloao.org/api/por_blj/JHN/${ch}.json`);
  if (!r.ok) throw new Error(`helloao JHN ${ch}: HTTP ${r.status}`);
  const pt = versesFrom(await r.json()).map((v) => ({ verse: v.number, pt: verseText(v) }));
  const greek = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("bible_original_tokens")
      .select("verse, position, surface, strong, gloss")
      .eq("book", "John").eq("chapter", ch)
      .order("verse").order("position").range(from, from + 999);
    if (error) throw new Error(error.message);
    greek.push(...data);
    if (data.length < 1000) break;
  }
  const verses = pt.map((v) => ({
    ...v,
    greek: greek.filter((g) => g.verse === v.verse).map((g) => ({ p: g.position, w: g.surface, s: g.strong, g: g.gloss })),
  }));
  const file = `scripts/align/work/jhn-${String(ch).padStart(2, "0")}.input.json`;
  fs.writeFileSync(file, JSON.stringify({ chapter: ch, verses }, null, 1));
  console.log(file, verses.length, "versículos");
}
```

Se o Node não importar `.ts` direto (`ERR_UNKNOWN_FILE_EXTENSION`), rodar com `node --experimental-strip-types --env-file=.env.local …` (Node 22.6+/24).

Run: `node --env-file=.env.local scripts/align/fetch-john.mjs`
Expected: 21 linhas `scripts/align/work/jhn-NN.input.json NN versículos` (João 1 = 51).

- [ ] **Step 2: Instruções dos subagentes**

`scripts/align/ALIGN-PROMPT.md`:

```markdown
# Ligação Bíblia Livre ↔ grego (um capítulo de João)

Entrada: `scripts/align/work/jhn-NN.input.json` = `{ chapter, verses: [{ verse, pt, greek: [{ p, w, s, g }] }] }`
(`pt` = texto português exato; `greek` = palavras gregas com Strong `s` e glosa inglesa `g`).

Saída: `scripts/align/work/jhn-NN.align.json` = `[{ verse, spans: [{ t, s }] }]`.

Regras (o validador recusa o arquivo se alguma falhar):
1. Concatenar os `t` de um versículo, na ordem, devolve `pt` EXATAMENTE (espaços e pontuação inclusos). Não corrigir, não normalizar.
2. Trecho com Strong (`s` preenchido) não começa nem termina com espaço ou pontuação. Espaços e pontuação ficam em trechos `s: null`.
3. `s` só pode ser um Strong que aparece nos `greek` daquele versículo.
4. Um Strong por trecho. Artigos e preposições portuguesas que só introduzem a palavra entram no trecho dela ("No princípio" → Strong de ἀρχῇ). Artigo grego (G3588) só ganha trecho próprio se não houver palavra de conteúdo para ele.
5. Palavra portuguesa sem correspondente grego (acréscimo da tradução) fica `s: null`.
6. Na dúvida, `s: null`. Errar por omissão é melhor que ligar errado.
7. Meta: pelo menos 85% das palavras gregas de conteúdo (Strong ≠ G3588) ligadas a algum trecho.

Escreva só o JSON no arquivo de saída. Ao terminar, rode `node scripts/align/validate-alignment.mjs NN` e corrija até passar.
```

- [ ] **Step 3: Validador (gera o TSV do loader)**

`scripts/align/validate-alignment.mjs`:

```js
// Valida a ligação de um ou mais capítulos e gera o TSV do loader.
// Uso: node scripts/align/validate-alignment.mjs 1        (um capítulo)
//      node scripts/align/validate-alignment.mjs all      (todos + work/tagged-john.tsv)
import fs from "node:fs";

const pad = (n) => String(n).padStart(2, "0");
const EDGE = /^[\s.,;:!?"'“”‘’()\[\]—–-]|[\s.,;:!?"'“”‘’()\[\]—–-]$/;

function check(ch) {
  const input = JSON.parse(fs.readFileSync(`scripts/align/work/jhn-${pad(ch)}.input.json`, "utf8"));
  const align = JSON.parse(fs.readFileSync(`scripts/align/work/jhn-${pad(ch)}.align.json`, "utf8"));
  const byVerse = new Map(align.map((a) => [a.verse, a.spans]));
  const errors = [];
  const rows = [];
  let content = 0;
  let linked = 0;
  for (const v of input.verses) {
    const spans = byVerse.get(v.verse);
    if (!spans) { errors.push(`v${v.verse}: faltando`); continue; }
    const joined = spans.map((s) => s.t).join("");
    if (joined !== v.pt) errors.push(`v${v.verse}: texto não bate\n  esperado: ${v.pt}\n  obtido:   ${joined}`);
    const allowed = new Set(v.greek.map((g) => g.s).filter(Boolean));
    const used = new Set();
    spans.forEach((s, i) => {
      if (!s.t) errors.push(`v${v.verse}#${i}: trecho vazio`);
      if (s.s) {
        if (!allowed.has(s.s)) errors.push(`v${v.verse}#${i}: ${s.s} não está no grego do versículo`);
        if (EDGE.test(s.t)) errors.push(`v${v.verse}#${i}: trecho ligado com espaço/pontuação na borda: "${s.t}"`);
        used.add(s.s);
      }
      rows.push(["por_blj", "John", ch, v.verse, i + 1, s.t.replace(/\t/g, " "), s.s ?? ""].join("\t"));
    });
    for (const g of v.greek) {
      if (!g.s || g.s === "G3588") continue;
      content++;
      if (used.has(g.s)) linked++;
    }
  }
  const coverage = content ? linked / content : 1;
  if (coverage < 0.85) errors.push(`cobertura ${(coverage * 100).toFixed(1)}% < 85%`);
  return { errors, rows, coverage };
}

const arg = process.argv[2];
const chapters = arg === "all" ? Array.from({ length: 21 }, (_, i) => i + 1) : [Number(arg)];
let failed = false;
const all = [];
for (const ch of chapters) {
  const { errors, rows, coverage } = check(ch);
  console.log(`João ${ch}: ${errors.length ? "FALHOU" : "ok"} · cobertura ${(coverage * 100).toFixed(1)}%`);
  for (const e of errors) console.log("  " + e);
  failed ||= errors.length > 0;
  all.push(...rows);
}
if (failed) process.exit(1);
if (arg === "all") {
  fs.writeFileSync("scripts/align/work/tagged-john.tsv", ["translation\tbook\tchapter\tverse\tposition\ttext\tstrong", ...all].join("\n") + "\n");
  console.log(`TSV: scripts/align/work/tagged-john.tsv (${all.length} linhas)`);
}
```

Atenção ao TSV: o loader transforma coluna vazia em `null`; um trecho `" "` (só espaço) NÃO é vazio e passa inteiro. Conferir que `toRow` do loader não faz `trim()` no valor (hoje não faz).

- [ ] **Step 4: Gerar a ligação com subagentes**

Despachar um subagente por capítulo (21, em lotes de até 7 em paralelo; modelo `sonnet` basta), cada um com: "Leia `scripts/align/ALIGN-PROMPT.md` e faça o capítulo NN de João. Não mexa em nenhum outro arquivo." Ao voltar cada um, rodar `node scripts/align/validate-alignment.mjs NN`; se falhar, devolver os erros ao mesmo subagente (SendMessage) até passar.

Run: `node scripts/align/validate-alignment.mjs all`
Expected: 21 linhas `João N: ok · cobertura ≥85%` e `TSV: … (~20000 linhas)`.

- [ ] **Step 5: Loader com modos `tagged` e `lexpt`**

Em `scripts/seed-original-text.mjs`:

```js
const TABLES = {
  tokens: "bible_original_tokens",
  lexicon: "strongs_lexicon",
  tagged: "bible_tagged_words", // ligação português↔original (spec 07)
  lexpt: "strongs_lexicon",     // só gloss_pt/definition_pt (spec 07)
};
```

e no `flush`:

```js
  const q = mode === "lexicon" || mode === "lexpt"
    ? supabase.from(table).upsert(rows, { onConflict: "strong" })
    : mode === "tagged"
      ? supabase.from(table).upsert(rows, { onConflict: "translation,book,chapter,verse,position" })
      : supabase.from(table).insert(rows);
```

Atualizar o comentário de uso no topo com as duas linhas novas (`tagged ./scripts/align/work/tagged-john.tsv`, `lexpt ./scripts/align/work/lexpt-john.tsv`).

- [ ] **Step 6: PARADA — carga com a service_role do dono**

Pedir ao dono para rodar no terminal dele (a chave nunca passa pelo chat):

```bash
export SUPABASE_URL="https://zzgxeylyrtzsqcdguxql.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="COLE_A_CHAVE_AQUI"
node scripts/seed-original-text.mjs tagged ./scripts/align/work/tagged-john.tsv
```

Expected: `Concluído: ~20000 linhas em bible_tagged_words.`

- [ ] **Step 7: PARADA — revisão por amostra**

Ligar `study.reader` só para a org do dono (painel `/admin`), pedir para ele abrir `/study/bible/JHN/1`, ligar a chave e tocar em umas 10 palavras. Erros apontados: corrigir no `jhn-01.align.json`, validar, regerar o TSV e recarregar (o upsert sobrescreve).

- [ ] **Step 8: Commit (só scripts, sem `work/`)**

```bash
git add scripts/align/fetch-john.mjs scripts/align/validate-alignment.mjs scripts/align/ALIGN-PROMPT.md scripts/seed-original-text.mjs .gitignore
git commit -m "feat(study): scripts da ligação Bíblia Livre↔grego (piloto João)"
```

---

### Task 10: Dados — glosas e definições em português (Strong de João)

**Files:**
- Create: `scripts/align/fetch-lexicon.mjs`
- Create: `scripts/align/validate-lexicon.mjs`
- Create: `scripts/align/LEX-PROMPT.md`

**Interfaces:**
- Consumes: `scripts/align/work/jhn-*.input.json` (Task 9 Step 1); modo `lexpt` do loader (Task 9 Step 5).
- Produces: `strongs_lexicon.gloss_pt`/`definition_pt` preenchidas para os Strong de João.

- [ ] **Step 1: Montar os lotes**

`scripts/align/fetch-lexicon.mjs`:

```js
// Lista os Strong de João (a partir das entradas da Task 9) e monta lotes de 80 com o
// verbete inglês resumido, para tradução.
// Uso: node --env-file=.env.local scripts/align/fetch-lexicon.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const strongs = new Set();
for (let ch = 1; ch <= 21; ch++) {
  const input = JSON.parse(fs.readFileSync(`scripts/align/work/jhn-${String(ch).padStart(2, "0")}.input.json`, "utf8"));
  for (const v of input.verses) for (const g of v.greek) if (g.s) strongs.add(g.s);
}
const list = [...strongs].sort();
const entries = [];
for (let i = 0; i < list.length; i += 300) {
  const { data, error } = await supabase.from("strongs_lexicon").select("strong, lemma, gloss, definition").in("strong", list.slice(i, i + 300));
  if (error) throw new Error(error.message);
  entries.push(...data.map((e) => ({ ...e, definition: (e.definition ?? "").slice(0, 1200) })));
}
for (let b = 0; b * 80 < entries.length; b++) {
  const file = `scripts/align/work/lex-${String(b + 1).padStart(2, "0")}.input.json`;
  fs.writeFileSync(file, JSON.stringify(entries.slice(b * 80, b * 80 + 80), null, 1));
  console.log(file);
}
console.log(`${entries.length} verbetes de ${list.length} Strong`);
```

Run: `node --env-file=.env.local scripts/align/fetch-lexicon.mjs`
Expected: ~13 arquivos `lex-NN.input.json` e a contagem (~1000 verbetes). Se `entries` < `list`, anotar os Strong sem verbete (a tela cai no inglês/sem glosa, o que é aceito).

- [ ] **Step 2: Instruções**

`scripts/align/LEX-PROMPT.md`:

```markdown
# Glosas e definições em português (lote NN)

Entrada: `scripts/align/work/lex-NN.input.json` = `[{ strong, lemma, gloss, definition }]` (verbete inglês do léxico STEPBible, CC BY 4.0).
Saída: `scripts/align/work/lex-NN.pt.json` = `[{ strong, gloss_pt, definition_pt }]`, um item por entrada, mesma ordem.

- `gloss_pt`: sentidos curtos em português do Brasil, separados por vírgula, no máximo 6 palavras ("palavra, mensagem, razão").
- `definition_pt`: 1 a 3 frases curtas, PT-BR, só o que o verbete diz (sem teologia nova, sem opinião). Referências bíblicas no formato brasileiro ("Jo 1.1").
- Nada de inglês no resultado. Nomes próprios no nome usual em português ("Pedro", "Jerusalém").
- Não traduzir literalmente abreviações do léxico (LXX, al., cf.): omitir.

Ao terminar, rode `node scripts/align/validate-lexicon.mjs NN`.
```

- [ ] **Step 3: Validador**

`scripts/align/validate-lexicon.mjs`:

```js
// Confere um lote traduzido (ou todos) e gera o TSV do modo `lexpt` do loader.
// Uso: node scripts/align/validate-lexicon.mjs 3   |   node scripts/align/validate-lexicon.mjs all
import fs from "node:fs";

const pad = (n) => String(n).padStart(2, "0");
const files = fs.readdirSync("scripts/align/work").filter((f) => /^lex-\d+\.input\.json$/.test(f)).sort();
const arg = process.argv[2];
const batches = arg === "all" ? files.map((f) => Number(f.slice(4, 6))) : [Number(arg)];
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
let failed = false;
const rows = [];
for (const b of batches) {
  const input = JSON.parse(fs.readFileSync(`scripts/align/work/lex-${pad(b)}.input.json`, "utf8"));
  const out = JSON.parse(fs.readFileSync(`scripts/align/work/lex-${pad(b)}.pt.json`, "utf8"));
  const errors = [];
  if (out.length !== input.length) errors.push(`itens: ${out.length} ≠ ${input.length}`);
  input.forEach((e, i) => {
    const o = out[i];
    if (!o || o.strong !== e.strong) { errors.push(`#${i}: esperado ${e.strong}`); return; }
    if (!clean(o.gloss_pt)) errors.push(`${e.strong}: gloss_pt vazio`);
    if (clean(o.gloss_pt).split(/\s+/).length > 8) errors.push(`${e.strong}: gloss_pt longo demais`);
    rows.push([e.strong, e.strong.startsWith("H") ? "hbo" : "grc", clean(o.gloss_pt), clean(o.definition_pt)].join("\t"));
  });
  console.log(`lote ${b}: ${errors.length ? "FALHOU" : "ok"}`);
  for (const x of errors) console.log("  " + x);
  failed ||= errors.length > 0;
}
if (failed) process.exit(1);
if (arg === "all") {
  fs.writeFileSync("scripts/align/work/lexpt-john.tsv", ["strong\tlang\tgloss_pt\tdefinition_pt", ...rows].join("\n") + "\n");
  console.log(`TSV: scripts/align/work/lexpt-john.tsv (${rows.length} linhas)`);
}
```

- [ ] **Step 4: Traduzir com subagentes e validar**

Um subagente por lote ("Leia `scripts/align/LEX-PROMPT.md` e faça o lote NN."), até 7 em paralelo; devolver erros ao mesmo subagente até o validador passar.

Run: `node scripts/align/validate-lexicon.mjs all`
Expected: todos `ok` e `TSV: … (~1000 linhas)`.

- [ ] **Step 5: PARADA — carga com a service_role do dono**

```bash
node scripts/seed-original-text.mjs lexpt ./scripts/align/work/lexpt-john.tsv
```

(com as mesmas duas variáveis exportadas da Tarefa 9). Expected: `Concluído: ~1000 linhas em strongs_lexicon.` Conferir que `gloss`/`definition` inglesas continuam intactas: `curl` anônimo em `strongs_lexicon?strong=eq.G3056&select=gloss,gloss_pt` devolve os dois preenchidos.

- [ ] **Step 6: Commit**

```bash
git add scripts/align/fetch-lexicon.mjs scripts/align/validate-lexicon.mjs scripts/align/LEX-PROMPT.md
git commit -m "feat(study): scripts das glosas em português (Strong de João)"
```

---

### Task 11: E2E, documentação e verificação final

**Files:**
- Create: `e2e/reader.spec.ts`
- Modify: `src/features/study/README.md`, `docs/orchestrator-state.md` (seção "ESTUDO — PIVÔ")

- [ ] **Step 1: E2E de fumaça**

`e2e/reader.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

// Fumaça da tela de leitura (spec 07). Exige a flag `study.reader` ligada para a org de
// teste (override no /admin) e a ligação de João carregada (Tarefa 9).
const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(EMAIL);
  await page.getByPlaceholder("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$|\/onboarding$/);
}

test.describe("Estudo → Bíblia (leitura)", () => {
  test.skip(!EMAIL || !PASSWORD, "fixture ausente (.env.test)");

  test("João 1 abre, a chave acende as palavras e o balão mostra o grego", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/JHN/1");
    await expect(page.getByTestId("reader-text")).toContainText("No princípio");
    await page.getByTestId("interlinear-toggle").check();
    const words = page.locator("[data-strong]");
    expect(await words.count()).toBeGreaterThan(10);
    await words.first().click();
    await expect(page.getByTestId("word-popover")).toBeVisible();
    await page.getByRole("button", { name: "Ver detalhes" }).click();
    await expect(page.getByTestId("word-tab")).toBeVisible();
  });

  test("Gênesis 1 lê normal e não mostra a chave", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/GEN/1");
    await expect(page.getByTestId("reader-text")).toBeVisible();
    await expect(page.getByTestId("interlinear-toggle")).toHaveCount(0);
  });
});
```

Run: `npm run test:e2e -- e2e/reader.spec.ts`
Expected: PASS (ou SKIP sem fixture; nesse caso registrar no handoff).

- [ ] **Step 2: Documentação**

`src/features/study/README.md`: seção nova "Leitura (spec 07)" com: rota, flag `study.reader`, arquivos (`reader.ts`, `reader-queries.ts`, `components/reader/*`), tabelas (`bible_tagged_words`, `gloss_pt`/`definition_pt`, RPC `strong_occurrences`), fontes/licenças e como regenerar os dados (`scripts/align/*`, Tarefas 9-10).

`docs/orchestrator-state.md`, seção "ESTUDO — PIVÔ": trocar "Próximo: plano de implementação" pelo estado real (tarefas feitas, flag ligada para quem, pendências).

- [ ] **Step 3: Verificação completa**

Run: `npm run verify`
Expected: typecheck + lint + test + build verdes. (Não rodar o build com o dev server de pé — memória `tally-dev-browser-hydration`.)

- [ ] **Step 4: Prova no navegador**

Com o dev server: `/study/bible/JHN/1` em desktop e em 375px; screenshot (ou `get_page_text` se o pane estiver oculto) mostrando texto sublinhado, balão, painel com a aba λόγος e a gaveta no celular. Mandar para o dono com `SendUserFile`.

- [ ] **Step 5: Commit e finalizar a branch**

```bash
git add e2e/reader.spec.ts src/features/study/README.md docs/orchestrator-state.md
git commit -m "docs(study): leitura da Bíblia documentada + e2e de fumaça"
```

Depois: superpowers:finishing-a-development-branch (merge no `main` = produção, com a flag desligada para todos exceto a org do dono).

---

## Cobertura da spec (auto-revisão)

| Requisito da spec 07 | Tarefa |
|---|---|
| Tarefa 0 (dado da ligação) | resolvida: decisão A do dono → Tasks 9 e 10 |
| Tabela `bible_tagged_words`, `gloss_pt`/`definition_pt` | 1 |
| Rota `/study/bible/[book]/[chapter]`, último lido, sub-nav com 3 itens, flag | 1, 4 |
| Barra `João 1 ▾ | Bíblia ▾` + chave só onde há dado | 4, 5 |
| Texto, capitular, versículos, anterior/próximo cruzando livros, ← → sem animação | 2, 4 |
| Balão (Ver detalhes, Anotar, Levar pro sermão) | 5, 7, 8 |
| Modo Original | 5 |
| Área de trabalho: fechada por padrão, fica aberta, máx. 5 abas, fechar a última fecha | 2, 6 |
| Abas Palavra, Versículo, Notas, Sermão; "+" só com o que existe | 6, 7, 8 |
| Celular: gaveta, peteleco, rubber-band | 2, 6 |
| Movimento (balão 150ms com origem, painel entra/sai pela direita, reduced-motion) | 4 (CSS), 6 |
| Atribuições de licença na tela | 4, 5, 6 |
| Testes unit / integração / e2e | 2, 3, 11 |
| Critérios de aceite 1-8 | 4-11 (verificação em cada tarefa + Task 11) |
