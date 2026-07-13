# Study — Redesign do editor de sermão para CANVAS (direção de design do dono)

Feedback do dono sobre o editor atual (Fase 1): virou um formulário de 2 colunas, com muitos campos pequenos, pouco espaço de escrita e poluição. Precisa ser **tão prático quanto o Word (ou mais) e bonito como o Notion** — um **canvas**.
Isso ALINHA com a spec (step-5.md §6 e §24): editor sente como Notion/Docs/Logos, NÃO Word-formulário. É uma passada de redesign **front-only** (o `content` jsonb já guarda as seções — não muda schema). Grada como FEATURE_VIEW (smoke).

## Princípio
A **escrita é a estrela**. Tudo que não é escrever fica fora do caminho até ser preciso. Calmo, premium, muito respiro, tipografia elegante (Poppins), lindo no tema claro (padrão) e no escuro.

## Layout de 3 zonas (spec §6)
- **Esquerda — navegador de estrutura (fino, colapsável):** o outline/seções do sermão; clicar salta pra seção (spec §7). Colapsado por padrão em telas menores.
- **Centro — o CANVAS (dominante):** ocupa a maior parte da largura. É aqui que se escreve.
- **Direita — assistente de estudo (colapsável, contextual):** onde entram o painel de escritura e a sermon-memory (Fases 3+). Aparece quando se clica numa referência ou se liga; escondido por padrão.

O estado default é **quase só o canvas central** — as laterais entram sob demanda.

## O canvas central
- **Título** como um H1 grande de documento (estilo título de página do Notion), sem rótulo "Título" nem caixa de formulário.
- **Passagem principal** e **Big idea** como subcabeçalho leve e elegante logo abaixo do título (não como dois campos rotulados).
- **Corpo como documento fluido**: as seções (Outline, Notas, Ilustrações, Aplicação, Resposta de oração) viram **blocos com cabeçalho dentro do fluxo**, não caixas de textarea lado a lado. Uma coluna de leitura confortável (largura de medida agradável, ~700-800px), boa entrelinha, muito espaço em branco.
- Escrever tem que ser **rápido e sem fricção** (foco no texto, teclado-amigável).

## Metadados fora do caminho (estilo "propriedades" do Notion)
Status, visibilidade, campus, série, data, subtítulo → NÃO ficam poluindo a escrita. Recolhê-los num **painel de Propriedades** (drawer/aba colapsável), acessível por um botão numa barra fina no topo. Fechado por padrão. O pastor abre quando quer setar; some quando escreve.

## Chrome mínimo
- **Autosave** com estado discreto ("Salvo" / "Salvando…") em vez de um botão "Salvar sermão" grande dominando a tela. (Se autosave for arriscado agora, um Salvar discreto no topo, não um bloco.)
- Poucas bordas, poucos cartões, nada de dashboard. Foco, quietude, premium (spec §24).

## Não perder
- Preservar todos os campos/seções que já existem (só reapresentá-los como canvas + propriedades) — nada de perder dado do `content` jsonb.
- A tela Library (lista/cards) pode continuar como está; o redesign é do **editor/detalhe** do sermão.
- Verde no /verify-app; a tela graduada segue em FEATURE_VIEWS (smoke). Sem validação MCP (front-only).

## Sequência sugerida
Melhor fazer este redesign **antes** de plugar a UI de escritura da Fase 3, porque o painel de escritura da Fase 3 é justamente a **zona direita (assistente de estudo)** deste canvas. Assim a comparação/painel nasce dentro do editor bonito, não no formulário antigo.
