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

Fonte das telas: conversa de 2026-10-01 (Mateus 1, 19 e 20 no Raízes).
