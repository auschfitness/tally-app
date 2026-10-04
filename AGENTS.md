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

### 0. FEITO em 2026-10-03 (main f915577; banco 333 -> 202 MB). Lição: o drop da tabela antiga veio ANTES de publicar e o app ficou quebrado no ar; banco só muda depois do código no ar.

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

### 2. Frente B: sublinhado completo (NT) (FEITO em 2026-10-03: 239 capítulos no Gemini + 21 de João carregados em bible_tagged_verses; pular para a 3)

Concluído em 2026-10-03: 7.957 versículos no banco (239 capítulos gerados pelo Gemini, 21 capítulos do gabarito de João, 92,3% de acordo médio com o estatístico e fallbacks nos 10,7% de falha).


### 3. Frente C: comentários bíblicos em João (FEITO em 2026-10-03: 1.164 comentários de João carregados em bible_commentary e aba Comentário pronta; pular para a 4)

Spec 09. Concluído em 2026-10-03: fontes Jamieson-Fausset-Brown e Tyndale traduzidas integralmente para PT nos 21 capítulos de João (1.164 comentários na tabela bible_commentary). Aba Comentário disponível na área de trabalho e no menu "+ Nova aba", com créditos e badges de licença.

### 4. Refazer a tela de login (FEITA em 2026-10-04 na branch, AGUARDANDO APROVAÇÃO do dono para publicar; prévias em docs/previews/login-*.png)

Pedido do dono: "a tela de login de modo geral tá bem ruim". Arquivos: `src/app/(auth)/login/` (page.tsx, LoginForm.tsx). Siga `docs/design-principles.md` e o visual novo do Estudo (menu lateral escuro, Literata no texto). Mostre uma prévia ao dono antes de publicar. O teste `e2e/auth.spec.ts` usa os placeholders "E-mail"/"Senha" e o botão "Entrar": mantenha-os ou ajuste o teste junto.

### 4b. Polir o login + "Esqueci a senha" (FEITA em 2026-10-04 na branch, AGUARDANDO APROVAÇÃO do dono para publicar)

Implementados o polimento do login, o botão de mostrar senha e os fluxos de recuperação e redefinição. Links de recuperação inválidos levam ao aviso de link expirado. Prévias em `docs/previews/`: `login-*.png`, `forgot-desktop-light.png`, `reset-desktop-light.png` e `reset-expired-desktop-light.png`. Não refazer. Publicar somente após o dono aprovar as prévias. O recebimento do e-mail real ainda depende de conferir a URL permitida no Supabase e testar com uma caixa de e-mail.

Spec (texto em PT-BR, sem travessão longo, sem emoji; manter placeholders "E-mail"/"Senha" e botão "Entrar", o e2e depende):

A) CSS `login.module.css`
1. Sem `.brand::after` (brilho) e sem `.tagline`.
2. Custom property `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)` no `.page`.
3. `.btn`/`.google`: `transition: transform 160ms var(--ease-out-strong), background 160ms ease, border-color 160ms ease`; `:active { transform: scale(0.97) }` (google 0.98). Hover só dentro de `@media (hover: hover) and (pointer: fine)`.
4. `.field input`: transition de border-color/box-shadow 120ms var(--ease-out-strong).
5. `.title`: 32px, letter-spacing -0.025em, line-height 1.1. `.verse cite`: letter-spacing .01em.
6. `.err`: opacity 0 + translateY(-2px) por padrão; `[data-on="true"]` opacity 1, translateY(0); 150ms ease-out-strong; min-height 18px.
7. Troca Entrar/Criar conta: título e subtítulo com `.swap` (transition filter/opacity 150ms ease) e `.swapping` (blur 2px, opacity .7); o modo troca após 150ms (setTimeout) e tira o swapping.
8. `.form` entra com `@starting-style { opacity 0; translateY(6px) }`, 240ms ease-out-strong.
9. `@media (prefers-reduced-motion: reduce)`: sem blur nem transform, só opacity.
10. Campo de senha com botão olho (`PasswordInput.tsx`): type="button", aria-label "Mostrar senha"/"Ocultar senha", SVG 18px cor var(--text-2), input com padding-right 44px.
11. Link "Esqueci a senha" (13px, var(--text-2), alinhado à direita, abaixo de Senha, só no modo login) para `/esqueci-senha`.

B) Erro no campo certo (`actions.ts` + LoginForm)
- `AuthState = { error: string | null; field?: "email" | "password" }`.
- signIn: "Invalid login credentials" -> "E-mail ou senha incorretos." (password); "Email not confirmed" -> "Confirme o e-mail pelo link que enviamos." (email); mensagem com "invalid" e "email" -> "E-mail inválido." (email).
- signUp: "already registered" -> "Este e-mail já tem conta. Entre com a senha." (email); "Password should be" -> "A senha precisa ter pelo menos 6 caracteres." (password).
- `.field[data-invalid="true"] input { border-color: var(--coral) }` + `aria-invalid`. Texto do erro só no `.err` (uma vez).

C) Esqueci a senha
- `/esqueci-senha`: mesmo layout (`s.page` + `<BrandPanel />`), título "Redefinir senha", campo E-mail, botão "Enviar link", link "Voltar para entrar". Action chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/auth/callback?next=/redefinir-senha" })` montando origin do mesmo jeito que o callback. Resposta sempre neutra: "Se existir conta com esse e-mail, enviamos um link para redefinir a senha."
- `/redefinir-senha`: "Nova senha" + "Confirmar senha" (iguais, mínimo 6), botão "Salvar senha", action `supabase.auth.updateUser({ password })` e `redirect("/")`. Sem sessão: "Link expirado. Peça um novo." com link para /esqueci-senha.
- Supabase: o dono precisa adicionar a URL de produção + `/auth/callback` em Authentication > URL Configuration se ainda não estiver (já deve estar, por causa do Google).

D) Verificação e entrega
1. `npm run verify`. Se um teste de integração falhar com "JWT issued at future", reexecute só ele: `npx vitest run <arquivo> --no-file-parallelism`. Nunca rode build com dev server no ar.
2. `npx playwright test e2e/tmp-shot.spec.ts e2e/auth.spec.ts` (screenshots em docs/previews/: login claro/escuro/celular, forgot, reset). Depois APAGUE `e2e/tmp-shot.spec.ts`.
3. Commit na branch (o hook faz push da branch). NÃO publique na main: mostre as prévias ao dono e espere "aprovado". Aí `git push origin HEAD:main`.

### 4c. Leitura: comentário corrido, sol/lua, sem Recentes, "Original" (FEITA e PUBLICADA em 2026-10-04)

Texto em PT-BR, sem travessão longo, sem emoji. Sem animação em ação frequente (troca de versículo, troca de tema).

1. **Aba Comentário vira texto corrido do capítulo** (`src/features/study/components/reader/CommentaryTab.tsx`, `src/features/study/commentary.ts`).
   - Nova função pura `chapterCommentary(rows, source, chapter): { blocks: (CmtBlock & { anchor?: { start: number; end: number } })[] }` que devolve TODOS os blocos da fonte escolhida, na ordem do capítulo (JFB: intro primeiro, depois cada linha por verse_start; Tyndale: cada segmento de `tyndaleSegments` na ordem). O primeiro bloco de cada trecho leva `anchor` (versículo inicial/final que ele cobre). `pickCommentary` pode continuar existindo para os testes antigos, mas a tela não usa mais.
   - Render: título fixo "Comentário de João N" + seletor JFB|Tyndale (como hoje). Corpo = todos os blocos. Antes de cada trecho com `anchor`, uma linha de referência pequena ("Jo 1.1-5", classe `.cmtLabel` já existe) com `id="cmt-v{start}"` e `data-start`/`data-end`.
   - Versículo selecionado no texto (`verse`): achar o trecho cujo intervalo cobre o versículo (o último que cobre, se vários); `scrollIntoView({ block: "start" })` SEM smooth, dentro do painel da aba (não a página); marcar o trecho com `data-on="true"` (barra fina à esquerda na cor var(--blue), sem transição). Sem versículo selecionado: nada marcado, texto começa do início. Remover a frase "Toque num versículo para ver o comentário." e o aviso "não comenta o versículo N" (não faz mais sentido; se a fonte não cobre o versículo, só não rola).
   - Crédito da fonte no fim, como hoje. Atualizar `commentary.test.ts` com um teste de `chapterCommentary` (ordem e anchors) e o e2e/smoke que existir para a aba.

2. **Sol/lua na barra da Bíblia** (`ReaderView.tsx`, barra superior onde estão Interlinear, Sermão, Notas): colocar `<ThemeToggle />` (versão ícone, já existe em `src/components/shared/ThemeToggle.tsx`) entre o interruptor Interlinear e o botão Sermão. Botão 32x32, ícone 18px, cor var(--text-2), `:active { transform: scale(0.95) }`, sem outra animação. Manter também a linha no menu do perfil.

3. **Tirar "Recentes" do menu lateral** (`src/components/shared/Sidebar.tsx`, bloco `STUDY_ONLY && recent.length`): apagar o bloco e o que ficar sem uso (prop/estado `recent`, CSS `.sb-recent` se só servir ali). O menu de capítulos (`ChapterPicker.tsx`) continua mostrando os recentes.

4. **Barra de seleção**: em `SelectionBar.tsx` trocar o rótulo "Estudar" por "Original" (abre a aba do versículo no grego/hebraico). Ajustar teste/e2e que procure "Estudar".

5. Verificar: `npm run verify` (teste de integração com "JWT issued at future" = reexecutar só ele com `--no-file-parallelism`), `npx playwright test e2e/reader.spec.ts`. Prévia: screenshot de João 1 com a aba Comentário aberta e o versículo 3 selecionado (claro e escuro) em docs/previews/. Commit na branch; só publicar (`git push origin HEAD:main`) depois do "aprovado" do dono.

### 4d. Harmonia visual: uma decisão só para cada coisa (FEITA e PUBLICADA em 2026-10-04, main b9f2459)

Entrega: quatro etapas verificadas, v2 definitivo, régua de estilos aplicada e ícones Lucide. A 4c entrou no commit `fdaf896` antes da etapa 2. Prévias e evidências em `docs/previews/4d-revisao.md`. Não refazer nem publicar sem aprovação das novas prévias.

Diagnóstico do dono: "o site parece genérico, o Codex e o app do Claude parecem um objeto só". A causa não é cor; é que o Tally toma a MESMA decisão de vários jeitos (7 tamanhos de texto, 8 raios, borda em tudo, ícones de traços diferentes, controles de alturas diferentes). A 4d é uma régua. Leia `docs/design-principles.md` e `docs/design-tokens.md` antes. Não mude fluxo nem funcionalidade; só visual. Trabalhe em ordem, um commit por etapa, `npm run verify` em cada uma.

**Etapa 1. Aposentar o v1 e ligar o v2 de vez** (`src/app/globals.css`, `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`, `src/features/flags/catalog.ts`).
- O conteúdo do bloco `[data-design="v2"]` sobe para o `:root`; o bloco v1 (valores "mentirosos") some; o seletor `[data-design="v2"]` e a flag `ui.design_v2` são removidos (catálogo, teste, layout). Confira que a tela de leitura e o login também recebem a fonte do sistema (o login hoje está fora do layout do dashboard).
- Tirar a Poppins do `app/layout.tsx` e de `globals.css` (`--font-poppins`). A Literata fica (é a fonte de leitura).
- Resultado esperado: UI inteira em `-apple-system, "Segoe UI Variable", system-ui`, 15px/22px no corpo.

**Etapa 2. A régua** (valores finais; qualquer outro número é erro):
- Texto: só `--t-11` (rótulo/legenda), `--t-13` (controles, menu, metadados), `--t-15` (corpo), `--t-17` (título de painel), `--t-22` (título de página). Pesos: 400 texto, 500 rótulo/controle, 600 título. Cor secundária sempre `var(--text-2)`. Nada de 12px, 12.5px, 13.5px, 14px, 24px, 26px.
- Raio: `--r-6` para controles (botão, input, item de menu, chip, aba), `--r-10` para painéis/cards/popovers/menus. `--r-pill` só para avatar e interruptor. Apagar `--r-14` e `--r-20` dos usos (cards usam `--r-10`).
- Altura de controle: 32px (botão, input, select, item de barra). Item do menu lateral: 32px. Padding horizontal 10px. Barra superior da Bíblia: 48px de altura, controles de 32px alinhados ao centro.
- Grade: todo espaçamento em `--s-*` (4, 8, 12, 16, 20, 24, 32). Recuo lateral de conteúdo: 16px no menu lateral, na barra superior e na coluna de leitura (o mesmo valor nos três).
- Bordas: remover `border: 1px solid var(--border)` de cards, painéis, tabelas, inputs em repouso e abas. Separação passa a ser por fundo: superfície = `var(--surface)`, painel ou hover = `var(--surface-2)`. Input em repouso: fundo `var(--surface-2)`, sem borda; no foco: anel de 2px `var(--blue)` por `box-shadow`. Borda só onde a diferença de fundo não existe (linha divisória de lista: 1px `var(--border)` com opacidade .6).
- Sombra: `--e-1` em popover/menu, `--e-2` em modal e sheet. Cards sem sombra.
- Estados: hover = fundo `var(--surface-2)` em 100ms `ease`; ativo (selecionado) = fundo `var(--surface-2)` + texto `var(--text)` peso 500, sem azul e sem borda; pressionado = `transform: scale(.97)` em 120ms `cubic-bezier(.23,1,.32,1)`; foco por teclado = anel `var(--blue)` 2px (`:focus-visible`). Hover só dentro de `@media (hover: hover) and (pointer: fine)`. Cor azul fica reservada para ação primária, link e seleção de texto da Bíblia.
- Aplicar a régua em: `globals.css` (botões, inputs, menu lateral `.sb*`, tabelas, chips, abas, `.iconbtn`), `src/features/study/study.module.css`, `src/features/study/components/reader/reader.module.css`, `src/app/(auth)/login/login.module.css`. Ao final, `grep -rEn "#[0-9a-fA-F]{3,6}|[0-9]+(\.[0-9]+)?px" src/features/**/*.module.css` tem que voltar vazio (fora `0px`, `1px` de linha e `2px` de anel de foco).

**Etapa 3. Um conjunto de ícones só.** Instalar `lucide-react`. Trocar todos os SVGs soltos de ícone (menu lateral, barra da Bíblia, abas da área de trabalho, SelectionBar, ThemeToggle, botão olho do login, Google fica) por Lucide com `size={16}` e `strokeWidth={1.75}`, alinhados ao centro da linha do texto (`display:inline-flex; align-items:center; gap: var(--s-2)`). O LogoMark não muda.

**Etapa 4. Varredura final com olho de régua.** Abrir Bíblia (João 1 com Comentário), Sermões, Notas, Ajustes, login, claro e escuro, 1280px e 390px. Checar: mesmo recuo lateral em menu/barra/conteúdo; nenhuma borda sobrando; todos os controles com 32px; nenhum texto fora dos 5 tamanhos; ícones do mesmo traço. Screenshots em `docs/previews/4d-*.png`.

Entrega: commits na branch, prévia para o dono, publicar só depois do "aprovado". Se a 4c (Antigravity) ainda não tiver sido mesclada, fazer rebase antes da etapa 2 para não conflitar no CommentaryTab/ReaderView.

### 5. AT passo 3: dicionário UBS hebraico (SDBH) (FEITA e PUBLICADA em 2026-10-04: 18.620 sentidos H carregados via MCP, função temporária apagada, banco 219 MB)

PREPARADA em 2026-10-04, carga concluída pelo Claude. Fonte oficial UBS
v0.9.3 já em português: 18.620 linhas, 7.981 Strong, aproximadamente 9,88 MB de JSON.
Scripts, conferências e ordem de carga em `scripts/ubs/README-HEBREW.md`.
SQL com senha preenchida em `scripts/ubs/work/hebrew/load.sql` (local, gitignored).
Prévia com dados UBS simulados: `docs/previews/task5-hebrew-gen1.png`.
Verificação passou: npm run verify (545 testes), 6 testes do importador e 11 e2e.
Carga e publicação concluídas pelo Claude; função temporária apagada.

Mesmo esquema da frente A (NT, já no ar: `scripts/ubs/`). Fonte: github.com/ubsicap/ubs-open-license (dicionário hebraico, CC BY-SA). Só depois da tarefa 1. Cuidado com o limite de 500 MB do banco.

### 6. Completar o sublinhado do Antigo Testamento (EM EXECUÇÃO em 2026-10-04)

Pedido do dono: completar as ligações das palavras, além da carga estatística já presente.
Fluxo retomável: definir `GEMINI_ALIGN_MODEL=gemini-3.1-flash-lite` no ambiente e
rodar `node --env-file=.env.local scripts/align/run-complete-ot.mjs`.
Não iniciar outra execução se esse processo já estiver ativo. Progresso e resultados
em `scripts/align/work/gem-ot/`; piloto atual em
`work/gem-ot-word-pilot-gemini-3.1-flash-lite/` (gitignored).
Piloto por palavras numeradas: 167 versículos, 3.887 palavras, 100% de cobertura,
96,06% de acordo com os gabaritos nas palavras comparáveis. O modelo inicial
Gemini 3.5 Flash Lite marcou 94,39% e atingiu a cota diária; a troca de modelo
passou por um novo piloto antes de retomar a geração. Os 12 gabaritos manuais
ficam preservados na carga final. O modelo escolhe Strong por posição; o texto é
recomposto da fonte local. Documentação: `scripts/align/README-OT-COMPLETE.md`.
Trechos já ligados pelo estatístico também são preservados; só suas lacunas são
preenchidas pelo candidato. A qualidade é medida antes dessa combinação.
Só montar a carga após todos os 929 capítulos e cobertura final >=95%. SQL e dados
ficam prontos automaticamente após geração, medição e montagem aprovadas. Conferir
espaço, pedir aprovação da carga, executar SQL pelo dono, carregar, conferir no
leitor e apagar a função temporária. Não marcar feita antes dessas etapas.

## Já feito (não refazer)

- Frente B: sublinhado completo do NT inteiro carregado em bible_tagged_verses (7.957 versículos, 2026-10-03).
- AT passo 2: definições do hebraico em português no banco (lex-69 a lex-175, carregados em 2026-10-02).
- AT passo 1: palavra em português ligada ao hebraico nos 39 livros. Os dados antigos de `bible_tagged_words` foram migrados para `bible_tagged_verses`: 23.145 versículos. Conferência integral em 2026-10-04: nenhum versículo faltando e nenhuma diferença frente aos TSVs estatístico + gabarito. A carga já está feita; cobertura de palavras portuguesas ligadas = 66,1%, portanto completar o sublinhado é uma melhoria distinta. Evidência: `docs/previews/at-carga-revisao.md`. Como refazer: `docs/backlog/estudo-referencia-raizes.md`, seção "Antigo Testamento".
- NT: ligação, léxico em PT, dicionário UBS completo.
- Lixeira de 30 dias, página Sermões, Notas, editor de sermão (spec 10), menu lateral novo.

