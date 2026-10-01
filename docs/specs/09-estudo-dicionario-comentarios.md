# Spec 09: Estudo, dicionário UBS, sublinhado completo e comentários (pivô Raízes, parte 3)

Aprovada pelo dono em 2026-10-01 (ordem A → B → C; tradução testa Haiku no piloto, com travas). Fontes já aprovadas (memória
"Parte 3: fontes"). Comparação que motivou: Efésios 4:5, "batismo", nosso app × Raízes.

## O que muda para quem lê

Três frentes, nesta ordem (cada uma vai ao ar sozinha):

### A. Dicionário na aba Palavra (o que o Raízes mostra e nós não)

Hoje a aba mostra o verbete curto do STEPBible ("Batismo ou imersão. Figurativamente…").
O Raízes mostra o **Dicionário Grego do NT da UBS** (Louw-Nida revisado), que é bem mais
fundo. Passamos a mostrar o mesmo, traduzido para português:

1. **Título** = glosas do sentido ("batizar, batismo").
2. **Definição curta** ("empregar água numa cerimônia religiosa…").
3. **Comentário** do verbete, em parágrafos (o texto longo sobre a Didaquê etc.).
4. **Etiquetas de domínio**: domínio e subdomínio ("Atividades religiosas", "Batizar").
5. **O versículo citado** com a palavra marcada ("Um só Senhor, uma só fé, um só
   **batismo**", Efésios 4:5).
6. Palavra com **vários sentidos** (ex. λόγος): todos numerados, e o **sentido usado neste
   versículo vem primeiro e destacado**. A UBS diz, versículo a versículo, qual sentido
   cada ocorrência usa; é isso que liga o sentido ao texto.
7. Rodapé: "Fonte: Dicionário Grego do Novo Testamento da UBS (CC BY-SA 4.0), tradução
   Tally" + **Citar (ABNT)** (copia a referência no formato ABNT).
8. Embaixo continua o que já temos e o Raízes não tem: forma de dicionário, gramática
   desta ocorrência, frequência, aba Ocorrências.
9. Sem verbete UBS (110 verbetes sem Strong, ou hebraico/AT): cai no verbete STEPBible
   de hoje, sem mudança.

### B. Toda palavra sublinhada no modo Interlinear

Hoje falta ligação em **45% das palavras de Efésios 4** (Mateus 5: 36%; João 3: 17%).
João foi ligado por IA; o resto do NT pelo alinhador estatístico, que descarta o que não
tem certeza. Quase tudo que falta é palavra pequena: "que", "de", "o", "a", "do", "é".

Proposta, sem custo de IA: **completar as lacunas por regra**, ligando a palavra pequena
à palavra grega da vizinha (artigo "o/a/os/as" → artigo grego ou o substantivo seguinte;
"do/da/de" → o substantivo seguinte; "é/são" → o verbo grego do trecho). Mede-se a
precisão contra João (ligado por IA, serve de gabarito) antes de aplicar no NT. Meta: ≥95%
das palavras sublinhadas sem baixar a precisão atual (~94%). Se a regra não bater a meta,
o plano B é refazer o NT com IA como foi João (custa bem mais; volto a perguntar antes).

### C. Comentários bíblicos (piloto João)

Nova aba **Comentário** na área de trabalho (no "+" e no botão Estudar): mostra o que
os comentaristas dizem do versículo escolhido, um bloco por autor, e acompanha a navegação
de capítulo. Piloto em João: **Jamieson-Fausset-Brown** (domínio público) e **Tyndale**
(CC BY-SA 4.0), traduzidos do inglês. Calvino fica para uma segunda leva.

## Tradução (custo)

Tudo por subagentes **Sonnet** em lotes, com validador que reprova lote recortado por
script ou incompleto (lição do léxico; nunca Haiku).

| frente | volume | lotes (~40 mil caracteres) |
|---|---|---|
| A, sentidos com uso em João (piloto) | 1.569 sentidos, 0,43 mi car. | ~11 |
| A, resto do NT | 7.586 sentidos, 1,7 mi car. | ~43 |
| A, nomes de domínio | 93 + 643 rótulos | 1 |
| C, comentários de João | ~85 mil palavras | ~12 |

Ordem: piloto João do dicionário → você olha na tela → resto do NT. Do espanhol (a UBS tem
versão espanhola revisada; ES→PT perde menos que EN→PT).

## Dados (migration m56, tabelas globais, leitura livre, como m53)

- `ubs_senses`: strong (normalizado, `G908`), lemma, entry_code (`53.41`), ordem do
  sentido, glosses_pt text[], definition_pt, comments_pt, domains_pt text[],
  subdomains_pt text[], refs text[] (versículos `BBBCCCVVV` onde o sentido é usado).
  Índice por strong.
- `bible_commentary`: source (`jfb`, `tyndale`), book (OSIS), chapter, verse_start,
  verse_end, text_pt, text_en. Índice por (book, chapter).
- Carga por script com a service_role do dono (como o léxico), migration colada no SQL
  Editor se o MCP negar.

## Fora do escopo

Hebraico/AT (dicionário SDBH existe, fica para depois), Calvino e outros comentaristas,
comentário fora de João, editor rico de nota.

## Pronto quando

- `npm run verify` verde; teste da escolha do sentido pelo versículo; teste da regra de
  lacunas (precisão contra João); e2e: abrir "batismo" em Ef 4:5 e ver glosa, domínio e
  versículo citado; abrir a aba Comentário em João 3:16.
- QA claro/escuro, desktop/celular.
