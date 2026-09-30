# Spec 07: Estudo, tela de leitura da Bíblia (pivô "modelo Bíblia Raízes", parte 1)

Aprovada pelo dono em 2026-09-30, a partir dos esboços do brainstorm (leitura-v3).
Complementa a spec 06 (o "Erro nº 1, a Bíblia está escondida" é resolvido aqui).

## Contexto

O dono achou a biblioteca de sermões v2 "a mesma coisa de antes" e trouxe uma referência:
o Bíblia Raízes (bibliaraizes.com.br), que ele assinou para a gente ver por dentro. A meta é
ter todas as funcionalidades de lá **exceto a IA** (as "Conversas"), usando as mesmas fontes
públicas e não o conteúdo deles.

O pivô foi quebrado em 4 partes. **Esta spec é só a parte 1:**

1. **Tela de leitura** com a palavra tocável e a área de trabalho em abas (esta spec)
2. Destaques coloridos e notas no versículo
3. Comentários (Calvino, Keil & Delitzsch...) e dicionário, traduzidos para PT, piloto em João
4. Biblioteca de obras

O app inteiro vai ser redesenhado depois. Esta tela segue `docs/design-principles.md`, mas
não precisa casar com o visual atual das outras telas.

## O que o Raízes faz (visto por dentro, 2026-09-30)

- Topo: `Gênesis 1 ▾ | Bíblia ▾` e uma chave **Interlinear**. O texto é a Bíblia Livre
  (URL `/bible/BLIVRE/GEN/1`).
- Chave ligada: cada palavra portuguesa que tem palavra original por trás ganha sublinhado.
  Tocar abre um balão (palavra hebraica, pronúncia, sentidos curtos, "Ver detalhes").
- "Ver detalhes" abre, no painel da direita, a aba **Definição Strong**: Definição (sentidos,
  exemplo, fonte citada, "Citar ABNT") e **Ocorrências** (livro, depois capítulo, depois pula
  para o texto).
- O seletor `Bíblia ▾` troca para **Original**: hebraico/grego palavra por palavra, com
  pronúncia e sentido em português embaixo.
- O painel da direita é uma **área de trabalho com abas** (Biblioteca, Nova nota, Comentário
  Bíblico, Definição Strong, Oração), com fechar, "+" e maximizar.
- Anterior/próximo capítulo no fim do texto; número do capítulo em capitular.

## O que já temos (não reescrever, reaproveitar)

| Dado / peça | Onde |
|---|---|
| Texto das traduções (inclui Bíblia Livre `por_blj`) | `src/lib/bible/source.ts` (API helloao) |
| Grego/hebraico por palavra, Strong, morfologia, glosa EN | `bible_original_tokens`, `strongs_lexicon` (m34) |
| Frequência por Strong | `strong_frequency` (m35) |
| Referências cruzadas TSK | `cross_references` (m33) |
| Contexto do livro | `bible_book_context` (m36) |
| Notas de passagem | `study_text_notes` (m37) |
| Lentes prontas (Traduções, Original, Palavras, Contexto, Referências, Notas) | `src/features/study/components/BibleCompare.tsx` |
| Editor de sermão com autosave e "levar pro sermão" | `src/features/study/components/SermonEditor.tsx` |
| Flags | `src/features/flags/catalog.ts` + migration `*_feature_flags.sql` |

## Tarefa 0: dado da ligação português ↔ original (bloqueia o sublinhado)

O sublinhado exige saber **qual palavra portuguesa corresponde a qual número Strong**. Esse
dado não existe no banco hoje. A fonte candidata é a Bíblia Livre com Strong (CC BY 4.0,
Diego Santos, Mario Sérgio, Marco Teles). O próprio Raízes usa essa tradução.

1. Baixar a Bíblia Livre de fonte oficial (eBible `porbr2018`: USFM / módulo SWORD; ou o
   módulo `BLivre` da CrossWire) e verificar se o texto traz marcação Strong
   (ex.: `\w palavra|strong="G3056"\w*` no USFM).
2. **Se trouxer:** importar **só João** para uma tabela nova (abaixo). Registrar a atribuição
   exigida pela licença na tela ("Bíblia Livre (BLIVRE), CC BY 4.0").
3. **Se não trouxer:** parar e avisar o dono. A parte 1 sai sem o sublinhado (modo Original
   e aba de palavra funcionam igual). Gerar a ligação por conta própria é decisão dele, não
   do agente.

Tabela nova (migration reversível, leitura livre como as outras tabelas bíblicas globais):

```
bible_tagged_words (
  translation text,  -- 'por_blj'
  book text, chapter int, verse int,
  position int,      -- ordem no versículo
  text text,         -- trecho português exatamente como aparece ("No princípio")
  strong text null,  -- 'G3056'; null = palavra sem original (artigo solto, pontuação)
  primary key (translation, book, chapter, verse, position)
)
```

## Glosas em português (piloto João)

`strongs_lexicon.gloss/definition` estão em inglês. Para os Strong que aparecem em João:
colunas novas `gloss_pt` e `definition_pt` (migration aditiva). A tradução é feita em lote
fora do app, revisada, e a tela cita a fonte: "léxico STEPBible (CC BY 4.0), tradução Tally".
Onde `gloss_pt` for nulo, a tela mostra a glosa inglesa. Nunca uma caixa vazia.

## Tela

### Rota e navegação

- Rota: `/study/bible/[book]/[chapter]` (códigos USFM, ex. `/study/bible/JHN/1`). URL
  compartilhável. `/study/bible` sem parâmetro abre o último capítulo lido
  (localStorage) ou João 1.
- Sub-nav do Estudo (variante v2): **Bíblia · Sermões · Séries**. Continua no teto de 3 itens
  do `StudyTabs.tsx`. O que sai da sub-nav (Notas e Mapa) fica no menu do módulo.
  Obs.: há ajustes não commitados de 2026-09-27 em `StudyTabs.tsx` e na biblioteca v2 (ver
  "Pendente" no fim). Esta spec parte do que está **commitado**.
- Atrás da flag nova `study.reader` (catálogo + migration de flag, desligada em produção até
  o dono aprovar no ar).

### Barra do topo

`João 1 ▾ | Bíblia ▾` e, à direita, a chave **Interlinear**.

- `João 1 ▾` abre um popover ancorado no título: busca de livro, grade de capítulos, 3
  recentes. Nada de coluna fixa de livros.
- `Bíblia ▾` alterna entre **Bíblia** (português) e **Original**.
- A chave Interlinear **só aparece** quando o capítulo tem `bible_tagged_words`. Fora de
  João ela não existe (nada de "em breve"). O estado da chave fica guardado (localStorage).

### Texto (modo Bíblia)

- Coluna de leitura com largura máxima confortável (~65 caracteres), serifada, número do
  capítulo em capitular, número do versículo discreto na cor da marca.
- Chave desligada: texto limpo, nada sublinhado.
- Chave ligada: cada trecho com `strong` ganha sublinhado leve; o tocado fica realçado.
- Fim do capítulo: anterior/próximo, cruzando livros (em João 1: "‹ Lucas 24 · João 2 ›"). Setas ← → do teclado trocam de
  capítulo, **sem animação** (ação de teclado, repetida).
- Tocar no **número do versículo** abre a aba do versículo (ver abaixo).

### Balão da palavra

Ao tocar num trecho sublinhado: balão ancorado na palavra com a palavra original, a
transliteração, o Strong, os sentidos curtos (`gloss_pt`) e dois botões: **Ver detalhes**
e **Anotar**. Se houver um sermão aberto na área de trabalho, aparece também **Levar pro
sermão** (insere o bloco formatado que o editor já sabe inserir).
Fecha com Esc, clique fora ou ✕.

### Modo Original

O versículo vira blocos: palavra grega, transliteração e sentido em português embaixo
(`bible_original_tokens` + `gloss_pt`). Cada bloco abre o mesmo balão. Hebraico em RTL,
como já funciona hoje nas lentes.

### Área de trabalho (painel da direita)

Fechada por padrão. Abre no primeiro "Ver detalhes", "Anotar", toque em número de versículo
ou "Abrir sermão", e **fica aberta**. Abrir outra coisa só acrescenta ou troca a aba, sem
animar o painel de novo. Fechar a última aba fecha o painel.

Abas da parte 1 (no máximo 5 abertas; a 6ª substitui a mais antiga):

| Aba | Conteúdo | Reaproveita |
|---|---|---|
| **Palavra** (ex. "λόγος") | Definição (`definition_pt`, fonte, citar) · Ocorrências (livro → capítulos com contagem → toque navega o texto para lá) | lentes Palavras-chave/Original |
| **Versículo** (ex. "João 1:1") | Traduções · Referências (TSK) · Contexto do livro | `BibleCompare` |
| **Notas** | Notas da passagem aberta; "Anotar" abre aqui já com a referência | `study_text_notes` |
| **Sermão** | Editor do sermão escolhido (lista dos em andamento + "Novo sermão") | `SermonEditor` |

O "+" da barra de abas oferece só o que existe: Notas e Sermão. Comentário, Biblioteca e
Oração entram quando as partes 3 e 4 tiverem conteúdo.

### Celular (< 768px)

Texto em tela cheia. O balão é igual. "Ver detalhes" sobe uma **gaveta** com as mesmas abas:
arrastar para cima = tela cheia; peteleco para baixo fecha (por velocidade, sem exigir
arrastar até o fim); arrastar além do topo tem resistência (rubber-band).

### Movimento

- Balão: entra de `scale(.96)` + opacidade, 150ms ease-out, com origem na palavra tocada.
- Painel: entra pela direita uma vez, 250ms, e sai pela direita. Troca de aba e de palavra:
  sem animação.
- `prefers-reduced-motion`: só fade curto.
- Usar os tokens `--dur-micro`, `--dur-panel` e `--ease` existentes.

## Fora de escopo (parte 1)

Destaques coloridos (parte 2) · comentários e dicionário Tyndale (parte 3) · biblioteca de
obras (parte 4) · oração com meta diária · onboarding com questionário · qualquer IA · Antigo
Testamento com sublinhado (depois do piloto) · arrastar palavra para o sermão (o botão
"Levar pro sermão" cobre).

## Testes

- Unit (lógica pura em `domain.ts`): montar os trechos de um versículo a partir de
  `bible_tagged_words`; agrupar ocorrências por livro/capítulo; regra das abas (acrescenta,
  troca, limite de 5, fechar a última fecha o painel).
- Integração: leitura de `bible_tagged_words` e `gloss_pt` para João 1.
- E2E: `/study/bible/JHN/1` renderiza o texto no SSR; com a chave ligada existem trechos com
  `data-strong`.

## Critérios de aceite

1. `/study/bible/JHN/1` mostra João 1 na Bíblia Livre com a atribuição da licença.
2. Com a chave ligada, tocar em "Verbo" abre o balão com λόγος e sentido em português.
3. "Ver detalhes" abre a aba da palavra com Definição e Ocorrências; tocar numa ocorrência
   leva o texto para aquele capítulo.
4. Tocar no número do versículo abre Traduções, Referências e Contexto, sem regressão nas
   lentes que o editor de sermão já usa.
5. Com um sermão aberto na área de trabalho, "Levar pro sermão" insere o bloco no sermão e o
   autosave salva.
6. Em 375px o painel é gaveta e fecha com peteleco.
7. Em Gênesis 1 a chave não aparece e a leitura funciona normal.
8. `npm run verify` verde; flag `study.reader` desligada em produção.

## Pendente (decisão do dono)

- Descartar ou aproveitar os ajustes não commitados da biblioteca v2 (2026-09-27): Notas na
  sidebar, abas Sermões·Séries·Mapa, botão Continuar, ponto de estado, coluna 69rem.
