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
