# Spec 10: redesign de Sermões, Notas e do editor de sermão

Aprovada pelo dono em 2026-10-01 a partir da prévia `docs/previews/redesign-sermoes-notas.html`,
com a revisão abaixo (lentes emil-design-eng e apple-design) já incorporada. Onde a prévia e
esta spec divergem, vale a spec.

Princípios: uma coisa principal por tela; hierarquia por peso/tamanho de letra, não por caixas;
separadores finos; o mesmo vocabulário em todo lugar ("Por data / Por série / Por livro");
excluir nunca pede confirmação (vai para a Lixeira); nada de travessão longo nem emoji no texto.

## Movimento (vale para tudo)

- Botões e linhas clicáveis: `:active { transform: scale(.97) }` 120 ms ease-out. Hover só em
  `@media (hover: hover) and (pointer: fine)`.
- Menus/popovers: crescem do botão que os abriu (`transform-origin` no gatilho), entrada
  `opacity 0 → 1` + `scale(.96) → 1` em 150 ms `cubic-bezier(.23,1,.32,1)`; saída 100 ms.
  Fecham com Esc e clique fora. Nunca `scale(0)`, nunca `transition: all`.
- Painel lateral (Passagens): entra e sai pela direita, `translateX`, 240 ms
  `cubic-bezier(.32,.72,0,1)`, SEM véu escuro (é paralelo, não bloqueia o texto). No celular vira
  folha que sobe de baixo e desce pelo mesmo caminho.
- Trocar de aba/segmento e atalhos de teclado: sem animação.
- `prefers-reduced-motion`: só fade de opacidade, sem deslocamento.
- Use CSS transitions (interrompíveis), não `@keyframes`, para o que abre/fecha.

## 1. Sermões (`/study`)

Substitui `SermonLibrary` e `SermonLibraryV2` (apagar ambos e o desvio pela flag
`study.library_v2` nesta página). Componente novo único.

- Cabeçalho: h1 "Sermões"; à direita botão primário "Novo sermão".
- Uma linha só: busca "Buscar por título, passagem ou série" (cresce) + segmentado
  "Por data | Por série | Por livro" à direita (no celular, o segmentado desce para a linha de baixo).
  O segmento escolhido vai para a URL (`?ver=serie` / `?ver=livro`; padrão = por data).
- Com texto na busca: os segmentos somem e aparece uma lista única de resultados (mesma linha de
  sermão abaixo), com "N resultados". Busca ignora acento (reaproveitar `searchSermons`).
- **Por data** (padrão):
  - "Continuar": UM destaque, o sermão em preparo editado por último (`inProgressSermon`).
    Mostra status, título grande em serifa, passagem, a ideia central (2 linhas no máximo, se
    houver), "editado há 2 h" e UMA dica do que falta (primeira de `missingParts`), sem marcador
    "·" na frente. Botão "Continuar escrevendo". O cartão inteiro é clicável.
  - "Em preparo": os outros sermões em aberto, em linhas.
  - "Pregados": agrupados por ano (cabeçalho do ano), mais recente primeiro.
  - "Arquivados (N)": recolhido, abre com clique.
  - Linha de sermão (igual em todas as listas): coluna da data ("14 set", números tabulares;
    "sem data" em cinza quando vazia), título, e embaixo em cinza "passagem · série". SEM
    etiqueta/pílula de série. Separador fino entre linhas.
- **Por série**: uma linha por série (título, "6 sermões · ago a out 2026", status em cinza);
  clicar abre `/study/series/[id]` (página existente fica). Botão "Nova série" (reaproveita
  `SeriesModal`). Sermões sem série no fim: "Sem série (N)".
- **Por livro**: o `ScriptureMap` existente, embutido aqui. `/study/map` e `/study/series`
  passam a redirecionar para `/study?ver=livro` e `/study?ver=serie`.
- Rodapé discreto da página: ícone de lixeira + "Lixeira" → `/study/trash` (é o caminho no celular).
- Vazio (nenhum sermão): uma frase "Seu primeiro sermão começa por uma passagem." + "Novo sermão".

## 2. Status: 3 em vez de 5

Na interface o pastor só escolhe entre **Rascunho**, **Pronto**, **Pregado**. O banco continua
com os 5 valores: `preparing` é mostrado como Rascunho; `archived` não é escolha de status, é a
ação "Arquivar"/"Desarquivar" do menu "···". Ajustar `STATUS_LBL` e afins em `domain.ts` (manter
os tipos). Cores do ponto: Rascunho cinza, Pronto azul, Pregado verde.

## 3. Editor de sermão (`SermonEditor`)

- Barra de cima: "‹ Sermões" (link; some quando `embedded`), status de salvamento em cinza
  ("Salvando…", "Salvo"), espaço, botão "Passagens N" (N = passagens reconhecidas), botão "···".
- Menu "···": "Arquivar" (ou "Desarquivar"), separador, "Excluir sermão" em vermelho com
  "Vai para a Lixeira por 30 dias" em cinza embaixo. Vale também no editor embutido da leitura
  (`embedded`): ao excluir lá, a aba Sermão volta para o seletor de sermões em vez de navegar.
  Botões de excluir antigos (fim de Propriedades) somem com a gaveta.
- Gaveta "Propriedades" REMOVIDA. Campos que saem da tela (dados preservados, continuam sendo
  gravados como estão): Subtítulo, Campus, Quem vê, Culto.
- Logo abaixo do título, três pílulas discretas, cada uma abre um menu pequeno a partir dela:
  - Status (ponto colorido + nome): Rascunho / Pronto / Pregado, com o atual marcado.
  - Data (ícone de calendário + "12 out 2026", ou "Marcar data" quando vazia): `DateField`
    existente no menu, com "Tirar data".
  - Série ("Série: Evangelho de João", ou "Sem série" em cinza): lista das séries + "Sem série".
- Passagem principal e ideia central SEM rótulo ao lado (nada de cara de formulário): a passagem
  logo abaixo das pílulas em cor de destaque, a ideia central em serifa itálica maior que o corpo.
  Os textos de ajuda viram placeholder quando vazios ("Passagem principal, ex.: João 3:16",
  "Ideia central, a mensagem em uma frase").
- O resto do canvas (corpo, seções, "+ Seção", autosave) fica como está.

## 4. Painel Passagens (substitui "Escrituras" / "Assistente de estudo")

- Título "Passagens", botão fechar (×). Sem a caixa "Reconhecer escrituras": o reconhecimento no
  corpo fica sempre ligado. Sem o botão "Estudo do Texto" (o `BibleCompare` continua existindo na
  leitura; só sai do editor).
- Lista das passagens reconhecidas, a principal primeiro com a etiqueta "Principal". Cada uma é
  uma linha que abre/fecha (a principal começa aberta). Aberta mostra:
  - o texto (serifa, número do versículo pequeno em sobrescrito) e o nome da tradução em cinza;
  - "Capítulo inteiro" / "Só a passagem" e "Abrir na Bíblia" (vai para `/study/bible/LIVRO/CAP`);
  - "Suas notas nesta passagem": as notas do texto (`study_text_notes`) daquele capítulo que caem
    na passagem, cada uma com "Usar no sermão" (reaproveita `AddToSermon` e o aviso
    "Adicionado em … · Desfazer" que já existe).
- Vazio: "Escreva uma passagem (ex.: João 3:16) no sermão e ela aparece aqui."

## 5. Notas (`/study/notes`)

A página passa a mostrar TODAS as notas: as do texto bíblico (`study_text_notes`, do próprio
autor) e as soltas (`study_notes`). Substitui `NotesBoard` + `NoteModal` desta página (o
`NoteModal` de `features/care` é outro, não mexer).

- Cabeçalho: h1 "Notas"; botão primário "Nova nota". Busca "Buscar nas notas" + segmentado
  "Por data | Por livro" na mesma linha (como em Sermões).
- **Por data** (padrão): todas misturadas, mais recente primeiro, agrupadas por "Hoje",
  "Esta semana", "Este mês", depois mês/ano.
- **Por livro**: grupos na ordem da Bíblia ("João" + "3 notas" em cinza); no fim "Sem passagem".
- Linha de nota: referência em cor de destaque ("João 2:6", ou o título da nota solta), o texto em
  até 2 linhas (serifa), data curta em cinza à direita. Nota do texto: clicar abre
  `/study/bible/LIVRO/CAP` (padrão de URL existente; se a leitura aceitar abrir a aba Notas no
  versículo, usar). Nota solta: clicar abre a folha de edição.
- Folha "Nova nota" / edição: um campo grande "Escreva sua nota…" e um campo pequeno
  "Passagem (opcional), ex.: João 3:16" com a ajuda "Com passagem, a nota aparece também no texto
  da Bíblia." Botões Cancelar / Guardar; na edição, "Excluir" (vai para a Lixeira, sem confirmar).
  Com passagem válida (`parseRefs`) grava em `study_text_notes` (livro OSIS, capítulo, versículo
  inicial/final); sem passagem grava em `study_notes` (título = primeira linha, até 80 letras;
  conteúdo = o resto). Campos antigos da nota solta (escopo, tópico, sermão, série, tags) saem da
  tela e são preservados no banco.
- Vazio: "Suas notas da leitura e as que você escrever aqui aparecem juntas."

## Fora do escopo

Cobrança, comentários (frente C), sublinhado (frente B), páginas de série por dentro.
