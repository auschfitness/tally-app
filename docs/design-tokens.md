# Tally: tokens de design

A tarefa 4d define uma única régua visual. Os tokens vivem no `:root` de
`src/app/globals.css` e valem também para o login. Não há flag nem visual v1.

## Tipografia

UI: `-apple-system, "Segoe UI Variable", system-ui, sans-serif`.
Literata permanece para texto bíblico e conteúdo de leitura.

| Token | Tamanho | Entrelinha | Uso |
|---|---|---|---|
| `--t-11` | 11px | `--lh-11`: 16px | Legendas |
| `--t-13` | 13px | `--lh-13`: 18px | Controles, menu, metadados |
| `--t-15` | 15px | `--lh-15`: 22px | Corpo |
| `--t-17` | 17px | `--lh-17`: 24px | Título de painel |
| `--t-22` | 22px | `--lh-22`: 28px | Título de página |

Pesos: 400 texto, 500 rótulo/controle, 600 título. Texto secundário usa `--text-2`.
Números usam `font-variant-numeric: tabular-nums`.

## Geometria

- `--r-6`: controles, chips e abas.
- `--r-10`: cards, painéis, menus e folhas.
- `--r-pill`: avatar e interruptor.
- `--control-h`: 32px. `--control-px`: 10px de padding horizontal.
- `--bar-h`: 48px, para a barra da Bíblia.
- `--s-1`, `--s-2`, `--s-3`, `--s-4`, `--s-5`, `--s-6`, `--s-8`: 4, 8, 12, 16, 20, 24, 32px.
- Recuo lateral: `--s-4` no menu, barra e conteúdo.

Larguras máximas de leitura e pontos de quebra são dimensões de layout em rem,
não novos tamanhos de texto ou espaçamento. CSS custom properties não funcionam
nas condições de media queries.

## Superfícies e estados

Cards: `--surface`, sem borda nem sombra. Inputs: `--surface-2`, sem borda em
repouso; foco com anel de 2px `--blue`. Separadores de lista: 1px `--border` a 60%.
Menus/popovers: `--e-1`. Modal/sheet: `--e-2`.

Hover: `--surface-2`, 100ms ease, somente com mouse/ponteiro preciso.
Selecionado: `--surface-2`, texto `--text`, peso 500. Pressionado: escala .97,
120ms `--ease-press`. Foco por teclado: anel azul de 2px.
Tema e seleção de versículo mudam sem animação.

Azul: ação primária, link e seleção bíblica. Cores de marcação bíblica vivem em
`--highlight-*` e representam a escolha do usuário. Cores secundárias de estado
comunicam erro/atenção, sem decorar cards. A região escura da marca usa os tokens
`--sidebar-text`, `--sidebar-muted`, `--sidebar-hover` para preservar contraste.

## Verificação

Não usar hex nem px crus nos módulos de features, exceto 1px de linha e 2px de foco.
Usar os cinco tokens de texto e os dois raios. Conferir claro/escuro e celular.
