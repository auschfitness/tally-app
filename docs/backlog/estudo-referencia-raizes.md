# Estudo: o que o Bíblia Raízes faz melhor (lista viva)

Comparação da nossa tela de leitura (`/study/bible`) com o bibliaraizes.com.br, a partir
das telas que o dono mandou. Serve de backlog: cada item vira tarefa quando entrar na fila.
Itens de IA ("Conversas") ficam fora, por decisão do pivô.

## Ocorrências (aba Palavra)

- [x] **Tocar numa ocorrência leva ao versículo exato**, com a palavra marcada e o texto
      rolado até ela (liga o Interlinear sozinho se estiver desligado). Feito em 2026-10-01.
- [x] **Contador "1 de 3 neste capítulo" com ‹ ›**. Feito em 2026-10-01.
- [x] Cartão do capítulo divergia do contador por 1 (Mt 1: cartão 41, contador 40).
      Decidido em 2026-10-01: o capítulo aberto mostra o número do contador (o que dá
      para percorrer com ‹ ›); os outros capítulos seguem com a contagem do grego.
- [x] **Filtro "Filtrar por livro ou capítulo…"** no topo da lista. Feito em 2026-10-01
      ("mateus", "mateus 20" e "20" funcionam; sem acento e sem caixa).
- [x] Livros como sanfona com seta; capítulos em cartões ("Capítulo 1 · 41 ocorrências").
      Temos o gráfico de barras por livro, que eles não têm; manter os dois. Feito em 2026-10-01.

## Layout geral

- [ ] **Tela de leitura em tela cheia.** Eles não têm a barra do topo do app nem as
      pílulas Bíblia/Biblioteca/Notas ocupando altura; o texto começa logo abaixo de
      "Mateus 20 ▾ | Bíblia ▾ · Interlinear". Depende da troca do menu lateral (o dono
      vai extinguir o menu atual).
- [x] **Setas ‹ › de capítulo no topo do texto**, ao lado de "MATEUS 20", não só no rodapé.
      Feito em 2026-10-01.
- [x] **Parágrafos.** A Bíblia Livre NÃO marca parágrafo (só um \p por capítulo); a
      divisão vem da World English Bible (domínio público, mesma numeração), em
      `src/lib/bible/paragraphs.json`, gerado por `scripts/build-paragraphs.mjs`. Salmos e
      poesia saem num bloco só (a WEB marca poesia linha a linha). Feito em 2026-10-01.
- [x] Aspas curvas (“ ”) no texto. Feito em 2026-10-01 (ao carregar o texto; o banco segue intacto).
- [ ] Menu lateral próprio do Estudo: Nova nota, Buscar, Biblioteca, Comentário Bíblico,
      Oração, Tutorial; seção "Notas" com estado vazio ("Criar primeira nota").
- [ ] Cor de destaque quente (contorno âmbar na palavra) no tema escuro; o nosso é azul.
      Decidir junto com a remodelação visual.

## Área de trabalho (painel da direita)

- [x] Abas com ícone por tipo (nota, definição), botão de **tela cheia** e de
      **recolher o painel** no canto direito. Feito em 2026-10-01
      (recolher deixa um trilho de 44px com o botão de reabrir; só no desktop).
- [ ] **Nota com editor rico**: título, H2, negrito, itálico, sublinhado, listas, citação,
      tabela, imagem; placeholder em serifa "Comece a escrever…".
- [x] Alça visível no meio do divisor (nós já temos o divisor arrastável). Feito em 2026-10-01.

## Destaques e notas (parte 2, melhorias)

- [ ] **Destacar palavras específicas**, não só o versículo inteiro (pedido do dono em
      2026-10-01). Hoje o destaque pinta o versículo todo (spec 08). Pontos a decidir:
      seleção por toque/arraste (no celular a seleção nativa é ruim), como conviver com o
      toque na palavra que abre a aba Palavra no Interlinear, e guardar o trecho por
      posição de palavra (o texto pode vir do helloao sem posição; precisa de âncora
      estável).

## Dicionário (parte 3 do plano)

- [x] Sentidos numerados do verbete com o **sentido deste versículo destacado** e o
      versículo citado com a palavra marcada. Feito em 2026-10-01 (spec 09).
- [x] Domínios semânticos em etiquetas ("Nascimento e procriação"). Feito em 2026-10-01.
- [ ] **"Citar (ABNT)" volta quando o app tiver domínio próprio** (hoje tallyos.vercel.app).
      Botão escondido em 2026-10-01 (`CITE_ON` em WordTab.tsx). Seguir o formato do Raízes,
      que cita a tradução e aponta para o versículo: "UNITED BIBLE SOCIETIES. Dicionário Grego
      do Novo Testamento da UBS. Tradução: Bíblia Raízes. [S. l.]: Bíblia Raízes, 2026.
      Traduzido de: UBS Dictionary of the Greek New Testament. Versão 1.1. [S. l.]: United
      Bible Societies, 2023. Disponível em: <url do versículo>. Acesso em: 1 out. 2026."
      Nosso equivalente: Tradução: Tally; Disponível em: <domínio>/study/bible/EPH/4#v11.

## Próximo chat

- [x] **Parte 2 do plano: destaques e notas no texto.** Feito em 2026-10-01 (spec 08):
      número do versículo abre balão com 5 cores + Anotar + Estudar versículo; lápis no
      versículo com nota. Tabela `study_highlights` (m55), privada por autor.

## Bugs anotados

- [x] **Desligar uma feature flag no /admin não esconde a função.** Causa: 6 das 10 flags
      não eram lidas por tela nenhuma (ex.: `study.bible_v2`), então mexer nelas não fazia
      nada. Corrigido em 2026-10-01: `study.interlinear` agora esconde a chave Interlinear;
      o painel marca as outras com "Ainda não esconde nada no app" (lista `UNWIRED_FLAGS`,
      travada por teste). Se ainda acontecer com flag ligada a tela: checar override da
      igreja ("Ligada só aqui" vence o global; não há botão para remover, só no banco).

## Próxima sessão (pedidos do dono, 2026-10-01 noite)

- [x] **Excluir sermão/rascunho com lixeira de 30 dias** (m57 `deleted_at` em sermons,
      study_notes, study_text_notes; /study/trash com Restaurar; vencidos são apagados ao
      abrir a lixeira). "Excluir sermão" fica no fim de Propriedades. FALTA: atalho para a
      Lixeira no celular (a barra de baixo não tem) e excluir pelo editor embutido da leitura;
      resolver junto com o redesign de Sermões.
- [x] **Símbolo perdido no texto (Jo 2:6):** na Bíblia Livre do helloao, o ")" que fecha o
      "(" de 8 notas de rodapé ficou fora da nota, logo depois dela (Jr 17:5, 17:23, Lm 1:19,
      3:36, Ez 22:10, Mt 23:5, Jo 2:6, Hb 10:29). Corrigido no parse (helloao.ts e scripts
      fetch-*.mjs) e nas 3 linhas do NT já no banco. Ap 17:14 tem ")" sem "(" no próprio texto
      da fonte: corrigido só no banco (refazer se o NT for importado de novo). O resto dos
      desemparelhados são parênteses/aspas que atravessam versículos (normal).
- [ ] **Refazer a página Sermões** (a biblioteca atual é inútil do jeito que está).
- [ ] **Refazer "Escrituras" e "Propriedades"** do editor de sermão (botões no canto que
      ninguém entende).
- [ ] **Refazer Notas** (página atual: um cartão solto, sem utilidade clara).
- [ ] Frente B (sublinhado completo) em andamento: ver "Frente B" abaixo.

## Frente B: sublinhado completo (estado em 2026-10-01)

- Regra sem IA (`scripts/align/fill-gaps.mjs`): leva a 100% das palavras sublinhadas, mas
  só ~42% das preenchidas batem com o gabarito de João (que agrupa palavra pequena com a
  de conteúdo). Abaixo da meta da spec 09.
- Plano B, IA grátis (`scripts/align/gemini-align.mjs`, Gemini flash-lite, toda palavra
  num trecho): piloto em João 14-16 passou no formato em só 44 de 91 versículos. Falta
  medir a qualidade contra o gabarito e entender as falhas (texto alterado? Strong fora do
  versículo?) antes de rodar o NT.

Fonte das telas: conversa de 2026-10-01 (Mateus 1, 19 e 20 no Raízes).
