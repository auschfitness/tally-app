# Tarefa 4d: revisão visual

As quatro etapas mantêm os fluxos existentes. O visual v2 agora vale para todo o app,
inclusive o login. UI na fonte do sistema; Literata preservada na leitura.

- Cinco tamanhos de texto e dois raios; controles e itens de menu com 32px.
- Barra da Bíblia com 48px e recuos laterais definidos por `--s-4`.
- Cards sem borda/sombra, inputs por fundo, foco com anel azul.
- Ícones de 16px e traço 1.75 via `UiIcon`, usando [Lucide React](https://lucide.dev/guide/react).
- A 4c foi incorporada antes da etapa 2. O rebase sobre origin/main não exigiu ajustes.

## Prévias

Capturadas na organização de teste. A nota de exemplo das imagens foi criada pelo
teste automatizado e removida ao final. Os arquivos são capturas reais do navegador.

| Tela | Desktop claro | Desktop escuro | Celular claro | Celular escuro |
|---|---|---|---|---|
| Bíblia com Comentário | [Claro](4d-biblia-1280-light.png) | [Escuro](4d-biblia-1280-dark.png) | [Claro](4d-biblia-390-light.png) | [Escuro](4d-biblia-390-dark.png) |
| Sermões | [Claro](4d-sermoes-1280-light.png) | [Escuro](4d-sermoes-1280-dark.png) | [Claro](4d-sermoes-390-light.png) | [Escuro](4d-sermoes-390-dark.png) |
| Notas | [Claro](4d-notas-1280-light.png) | [Escuro](4d-notas-1280-dark.png) | [Claro](4d-notas-390-light.png) | [Escuro](4d-notas-390-dark.png) |
| Ajustes | [Claro](4d-ajustes-1280-light.png) | [Escuro](4d-ajustes-1280-dark.png) | [Claro](4d-ajustes-390-light.png) | [Escuro](4d-ajustes-390-dark.png) |
| Login | [Claro](4d-login-1280-light.png) | [Escuro](4d-login-1280-dark.png) | [Claro](4d-login-390-light.png) | [Escuro](4d-login-390-dark.png) |

## Verificação

`npm run verify` executado em cada etapa. A etapa 1 teve um erro de integração
`JWT issued at future`; a repetição isolada passou, seguida do build.

Na revisão final do navegador, 16 dos 17 testes passaram na primeira execução.
O caso de salvar nota e mostrar o lápis passou na repetição isolada, sem alterar
seu comportamento. A nota de teste foi limpa antes da repetição e removida pelo
próprio teste no final. Os demais casos cobriram login/logout, João e Gênesis,
dicionário, seleção, abas e tema.

Os quatro arquivos `4d-audit-*.json` registram a medição das 20 combinações:
nenhuma fonte visível fora dos cinco tamanhos, nenhum controle medido fora de 32px
e nenhuma página com vazamento horizontal. A medição exclui palavras/números
clicáveis do texto bíblico e checkboxes, que preservam sua função de leitura.

A busca nos módulos das features não encontrou hex nem medidas em px fora de
0, 1 e 2px. Os scripts temporários de captura e conversão foram removidos.

Publicação pendente da aprovação do dono, conforme a seção 4d do AGENTS.md.
