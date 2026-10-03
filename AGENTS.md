# Tally: instruções para o agente (OpenCode)

Leia este arquivo inteiro antes de agir. Ele substitui o CLAUDE.md, que está desatualizado (fala de Vite; o app hoje é Next.js).

## Contexto em 1 minuto

- Tally é um "Church OS". Hoje SÓ o módulo **Estudo** aparece (`STUDY_ONLY` em `src/config/nav.ts`): leitura da Bíblia estilo Bíblia Raízes, palavra em português ligada ao grego/hebraico, dicionário, sermões e notas.
- Stack: Next.js (App Router) + TypeScript estrito + Supabase (projeto `zzgxeylyrtzsqcdguxql`, plano GRÁTIS, banco em ~330 MB de 500 MB).
- O dono (Gaybiel) é de marketing, não é dev. Explique em português simples, em poucas linhas. Peça aprovação antes de mudança grande (tela nova, apagar coisa, carga grande no banco).
- Texto que o usuário vê ou recebe: sem travessão longo (—), sem emoji, sem cara de texto de IA.

## Onde trabalhar

- Pasta: `tally-app-leitura` (esta). É um worktree git na branch `feature/estudo-dicionario`, igual à `main`.
- Um hook de post-commit faz push da branch sozinho. Publicar no ar = `git push origin HEAD:main` (a Vercel faz o deploy). Só publique depois de verificar.
- Verificação: `npm run verify` (typecheck + lint + teste + build). Leitura: `npx playwright test e2e/reader.spec.ts` (usa `.env.test`, sobe o dev server na porta 3000). Nunca rode o build com o dev server no ar.
- Segredos: `.env.local` tem só a anon key. NÃO existe service_role aqui. Coisa que exige SQL (criar ou apagar função, migration) o dono cola no **SQL Editor do Supabase**. Escreva o SQL pronto para ele colar.
- Pastas `scripts/*/work/` são gitignored (dados grandes, gerados por script).

## Fila de tarefas (nesta ordem)

### 0. PRIORIDADE: compactar a ligação no banco (espaço, plano grátis)

O banco está em ~333 MB de 500 MB; `bible_tagged_words` sozinha ocupa 160 MB (1,1 milhão de linhas, uma por trecho, incluindo espaços). Meta: uma linha por VERSÍCULO. Ordem segura (o app nunca fica sem dados):

1. Migration nova `supabase/migrations/<data>_m58_bible_tagged_verses.sql` (o dono cola no SQL Editor, ou o Claude aplica):
   ```sql
   create table if not exists public.bible_tagged_verses (
     translation text not null, book text not null, chapter int not null, verse int not null,
     spans jsonb not null,  -- [["No princípio","G0746"],[" ",null],...] na ordem
     primary key (translation, book, chapter, verse)
   );
   alter table public.bible_tagged_verses enable row level security;
   create policy tagged_verses_read on public.bible_tagged_verses for select using (true);
   insert into public.bible_tagged_verses (translation, book, chapter, verse, spans)
   select translation, book, chapter, verse, jsonb_agg(jsonb_build_array(text, strong) order by position)
   from public.bible_tagged_words group by translation, book, chapter, verse
   on conflict do nothing;
   ```
2. `src/features/study/reader-queries.ts`, `getTaggedChapter`: ler `bible_tagged_verses` (select verse, spans; eq translation/book/chapter; order verse) e devolver o MESMO `TaggedWordRow[]` de hoje (position = índice + 1, text = spans[i][0], strong = spans[i][1]). Nada mais no app muda. Ajustar `reader-queries.integration.test.ts` e `src/lib/database.types.ts` (tipo da tabela nova).
3. `scripts/seed-original-text.mjs` modo `tagged`: continuar lendo o mesmo TSV, mas agrupar por versículo e fazer upsert em `bible_tagged_verses` (onConflict translation,book,chapter,verse). No caminho via token, a função temporária `tmp_tagged_load` precisa gravar na tabela nova.
4. Verificar: `npm run verify` + `npx playwright test e2e/reader.spec.ts` (João 1 e Gênesis 1). Publicar (`git push origin HEAD:main`).
5. Só DEPOIS de publicado e conferido no ar: `drop table public.bible_tagged_words;` (dono/Claude). Conferir o tamanho com `select pg_size_pretty(pg_database_size(current_database()));`.

### 1. AT passo 2: traduzir o léxico hebraico para português (FEITO em 2026-10-02: 8.515 verbetes no banco; pular para a 2)

Hoje a aba Palavra mostra a definição do hebraico em inglês. Os lotes já estão montados:
`scripts/align/work/lex-69.input.json` até `lex-175.input.json` (8.515 verbetes, 80 por lote). Os lotes 1 a 68 são do NT e já estão prontos (não mexer).

Para cada lote:
1. Leia `scripts/align/LEX-PROMPT.md` (regras) e o `lex-NN.input.json`.
2. Escreva `scripts/align/work/lex-NN.pt.json` à mão: `[{ strong, gloss_pt, definition_pt }]`, mesma ordem. Nomes próprios na forma usual brasileira ("Abraão", "Jerusalém"); referências no formato "Gn 1.1".
3. Rode `node scripts/align/validate-lexicon.mjs NN` e corrija até dar `ok`.

PROIBIDO gerar a tradução por script (recortar o inglês, dicionário automático etc.). Já aconteceu de um modelo fazer isso, e o validador foi endurecido para pegar. Se um lote vier cortado no meio, refaça o lote.

Quando os 107 lotes passarem:
1. `node scripts/align/validate-lexicon.mjs all` gera `scripts/align/work/lexpt-nt.tsv` (NT + AT; recarregar o NT não faz mal).
2. Peça ao dono para colar no SQL Editor (troque SENHA por uma senha aleatória longa):
   ```sql
   create or replace function public.tmp_lexpt_load(p_token text, p_rows jsonb) returns int
   language plpgsql security definer set search_path = public as $$
   declare n int;
   begin
     if p_token is distinct from 'SENHA' then raise exception 'token'; end if;
     update strongs_lexicon l set gloss_pt = r->>'gloss_pt', definition_pt = r->>'definition_pt'
     from jsonb_array_elements(p_rows) r where l.strong = r->>'strong';
     get diagnostics n = row_count; return n;
   end $$;
   grant execute on function public.tmp_lexpt_load(text, jsonb) to anon;
   ```
3. Rode `LOAD_TOKEN=SENHA node --env-file=.env.local scripts/seed-original-text.mjs lexpt scripts/align/work/lexpt-nt.tsv`.
4. Peça ao dono para apagar a função: `drop function public.tmp_lexpt_load(text, jsonb);`
5. Confira no app: Gênesis 1, chave Interlinear ligada, toque em "criou": a definição tem que aparecer em português.

### 2. Frente B: sublinhado completo (NT)

REGRA (2026-10-03): arquivos de `work/gem/` SÓ saem do `gemini-align.mjs` (via `run-gemini-nt.sh`). Nunca escreva, gere ou complete esses arquivos à mão ou com outro script: 39 capítulos feitos assim concordavam só 33-73% com o estatístico (o script dá 89-94%) e foram movidos para `work/gem-suspeitos/`. Cota do Gemini acabou = espere e rode o script de novo.

EM ANDAMENTO (2026-10-02): `bash scripts/align/run-gemini-nt.sh` (de scripts/align) roda o NT todo pelo Gemini grátis, grava em `work/gem/`, log em `work/gem-run.log`. Para sozinho quando a cota acaba (sem gravar capítulo pela metade); é só rodar de novo. Depois: medir, montar o TSV e carregar (versículo com `failed` fica com o estatístico).

Estado e números em `docs/backlog/estudo-referencia-raizes.md`, seção "Frente B". Resumo: a regra sem IA (`scripts/align/fill-gaps.mjs`) acerta só ~42%; o piloto `scripts/align/gemini-align.mjs` passou no formato em só 44 de 91 versículos. Primeiro descubra por que falha e meça contra o gabarito de João, antes de rodar no NT inteiro. Spec: `docs/specs/09-estudo-dicionario-comentarios.md`.

### 3. Frente C: comentários bíblicos em João

Spec 09. Fonte: `https://bible.helloao.org/api/c/<id>/JHN/<cap>.json`, ids `jamieson-fausset-brown` (domínio público) e `tyndale` (CC BY-SA). Traduzir para PT por lotes com validador, no mesmo esquema da tarefa 1. Antes de carregar, confira o espaço do banco (plano grátis).

### 4. Refazer a tela de login

Pedido do dono: "a tela de login de modo geral tá bem ruim". Arquivos: `src/app/(auth)/login/` (page.tsx, LoginForm.tsx). Siga `docs/design-principles.md` e o visual novo do Estudo (menu lateral escuro, Literata no texto). Mostre uma prévia ao dono antes de publicar. O teste `e2e/auth.spec.ts` usa os placeholders "E-mail"/"Senha" e o botão "Entrar": mantenha-os ou ajuste o teste junto.

### 5. AT passo 3: dicionário UBS hebraico (SDBH)

Mesmo esquema da frente A (NT, já no ar: `scripts/ubs/`). Fonte: github.com/ubsicap/ubs-open-license (dicionário hebraico, CC BY-SA). Só depois da tarefa 1. Cuidado com o limite de 500 MB do banco.

## Já feito (não refazer)

- AT passo 2: definições do hebraico em português no banco (lex-69 a lex-175, carregados em 2026-10-02).

- AT passo 1: palavra em português ligada ao hebraico nos 39 livros (844 mil linhas em `bible_tagged_words`). Como refazer: `docs/backlog/estudo-referencia-raizes.md`, seção "Antigo Testamento".
- NT: ligação, léxico em PT, dicionário UBS completo.
- Lixeira de 30 dias, página Sermões, Notas, editor de sermão (spec 10), menu lateral novo.
