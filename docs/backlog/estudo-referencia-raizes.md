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
- [ ] **Parágrafos.** O texto deles quebra em parágrafos (Mt 20: v.1, v.6, v.11); o nosso é
      um bloco único. A Bíblia Livre traz a marcação de parágrafo; precisa vir na carga.
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

## Dicionário (parte 3 do plano)

- [ ] Sentidos numerados do verbete com o **sentido deste versículo destacado** e o
      versículo citado com a palavra marcada.
- [ ] Domínios semânticos em etiquetas ("Nascimento e procriação").
- [ ] "Citar (ABNT)".

## Próximo chat

- [ ] **Parte 2 do plano: destaques e notas no texto** (marcar versículos com cores, ver
      as notas no próprio texto). Próxima peça grande, combinada com o dono em 2026-10-01.

## Bugs anotados

- [x] **Desligar uma feature flag no /admin não esconde a função.** Causa: 6 das 10 flags
      não eram lidas por tela nenhuma (ex.: `study.bible_v2`), então mexer nelas não fazia
      nada. Corrigido em 2026-10-01: `study.interlinear` agora esconde a chave Interlinear;
      o painel marca as outras com "Ainda não esconde nada no app" (lista `UNWIRED_FLAGS`,
      travada por teste). Se ainda acontecer com flag ligada a tela: checar override da
      igreja ("Ligada só aqui" vence o global; não há botão para remover, só no banco).

Fonte das telas: conversa de 2026-10-01 (Mateus 1, 19 e 20 no Raízes).
