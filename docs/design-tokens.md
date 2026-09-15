# Tally — Tokens de Design

Este documento **governa todo trabalho visual** do app. `docs/design-principles.md` diz
*por que* (uma ação primária, revelação progressiva, ar no lugar de caixas, cor contida);
este aqui diz *com quais valores*. Se um componente precisa de um número que não está
abaixo, o número está errado — não o documento.

Regra única e inegociável: **nenhum valor cru em `src/features/**/*.module.css`.**
Sem hex, sem px de tipografia/raio/sombra/espaço. Só `var(--token)`.

```bash
# a lista do que ainda falta converter
grep -rEn "#[0-9a-fA-F]{3,6}|[0-9]+px" src/features/**/*.module.css
```

---

## Como este documento está ligado ao código

Os tokens vivem em `src/app/globals.css`, definidos **duas vezes**:

| bloco | seletor | valores |
|---|---|---|
| **v1** (hoje) | `:root` | o que o app usa hoje de fato |
| **v2** (o alvo) | `[data-design="v2"]` | o que está neste documento |

O `[data-design="v2"]` é escrito pelo layout do dashboard a partir de
`flagOn(ctx, "ui.design_v2")` — mesmo truque que o `data-theme` do layout raiz usa para
o tema escuro. **Flag desligada → nenhum seletor v2 casa → o app é exatamente o de
hoje.** Em produção a flag está desligada.

Consequência que confunde na primeira leitura: no bloco v1 o nome do token **mente**
(`--t-15: 14px`, `--r-14: 16px`). É andaime proposital. Sem isso, trocar `14px` por
`var(--t-15)` num `module.css` já mudaria o visual atual e a flag viraria decoração.
O bloco v1 está marcado com um comentário `ponytail:` no `globals.css` e some quando
o dono aprovar o v2 — aí o conteúdo do bloco v2 sobe para o `:root` e os nomes voltam
a dizer a verdade.

**Escreva sempre o token, nunca o valor.** Quem escreve `var(--r-14)` acerta nas duas
versões; quem escreve `14px` acerta em uma e erra na outra.

---

## Tipografia

A Poppins sai no v2. Ela é a fonte geométrica arredondada de todo template e todo
gerador de site — sozinha já entrega o jogo de "feito por IA". A stack do sistema dá o
acabamento macOS de graça e ainda remove um webfont do carregamento.

```css
--font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable",
           "Inter", system-ui, sans-serif;
```

> Conflito conhecido: `docs/design-principles.md` §Linguagem visual ainda diz "Poppins".
> Enquanto a flag estiver desligada, ele está certo. Quando o v2 for aprovado, aquela
> linha precisa ser atualizada para apontar para cá.

Escala fechada. **Não existe valor fora dela, e não existe meio pixel.**

| token | v2 | entrelinha | uso |
|---|---|---|---|
| `--t-11` | 11px | `--lh-11` 16 | rótulo, caption, chip |
| `--t-13` | 13px | `--lh-13` 18 | secundário, meta |
| `--t-15` | 15px | `--lh-15` 22 | corpo (era 14 — sobe, é mais respirado) |
| `--t-17` | 17px | `--lh-17` 24 | título de painel |
| `--t-22` | 22px | `--lh-22` 28 | título de tela |
| `--t-28` | 28px | `--lh-28` 34 | número de destaque |
| `--t-34` | 34px | `--lh-34` 40 | número herói |

Entrelinha é token separado (`--lh-*`) porque no v1 ela vale `normal` — assim adotar
`font-size: var(--t-15)` num componente não mexe no espaçamento atual.

- **Pesos:** 400 corpo, 500 ênfase, 600 título. **Nunca 700.**
- **Letter-spacing:** `var(--track-tight)` (−0.01em no v2, `normal` no v1) em tudo ≥22px.
- **Números:** sempre `font-variant-numeric: tabular-nums`. Coluna de valor que dança
  quando o dígito muda é acabamento errado.

## Raios

Quatro degraus. Um quinto raio numa tela nova é bug de revisão.

| token | v2 | uso |
|---|---|---|
| `--r-6` | 6px | controle pequeno: chip, tag, `<select>` compacto |
| `--r-10` | 10px | botão, input |
| `--r-14` | 14px | cartão, painel, tabela |
| `--r-20` | 20px | modal, sheet, drawer |

`--r-pill` (999px no v2) é **forma**, não degrau da escala: pílula, avatar, badge
redondo. Não use para cantos de caixa.

## Elevação

Dois níveis, sutis. A referência usa **borda antes de sombra** — se a borda já separa a
superfície do fundo, não empilhe sombra em cima.

```css
--e-1: 0 1px 2px rgba(16,24,40,.05);   /* cartão pousado */
--e-2: 0 8px 24px rgba(16,24,40,.08);  /* painel, modal, drawer */
```

No tema escuro os dois tokens ganham valores próprios (sombra clara não existe sobre
fundo escuro). Não escreva `box-shadow` literal: use `var(--e-1)` / `var(--e-2)` e o
tema se resolve sozinho.

## Cor

**Um acento.** O azul da marca (`--blue`, #2B5CE6) é o **único fill colorido da
interface**: ação primária, seleção, link, preenchimento de barra. Nada mais.

Verde, laranja e coral **não são fundo**. São texto e ponto.

```html
<!-- antes: pílula vermelha preenchida -->
<span class="hb risk">Risco</span>

<!-- depois: ponto de 6px + texto na cor do corpo -->
<span class="hb risk">Precisa de atenção</span>
```

O `.hb` é o mesmo elemento — quem muda é o CSS sob `[data-design="v2"]`. Essa única
troca remove a maior parte da cara de dashboard gerado. Já aplicado em `.hb`,
`.stat.alert`, `.engbar > i` e `.gbar > i`.

**Barra de saúde é exceção deliberada.** Numa barra a *largura* é o dado; a cor só
repetia o que o número ao lado já dizia. Então a barra continua barra (trocá-la por um
ponto destruiria a quantidade) e o preenchimento vira azul. O estado fica no ponto/texto
vizinho.

Neutros com leve viés frio, contraste alto no texto: `--text`, `--text-2`, `--border`,
`--surface`, `--surface-2`, `--bg`, `--main`. **Cinza é o material da interface; cor é
exceção.** Antes de usar `--green`/`--coral`/`--warn`, pergunte: isso comunica estado ou
está decorando? Se decora, é cinza.

## Ar

Grid base de **4px**. Todo espaço é múltiplo.

| token | valor |
|---|---|
| `--s-1` … `--s-8` | 4, 8, 12, 16, 20, 24, 32px |

- `--pad-card`: padding de cartão — sobe de 16 para **20** no v2.
- `.cards` deixa de ser 4 colunas fixas: `repeat(auto-fit, minmax(200px, 1fr))`.
- Hierarquia por espaçamento e tipografia, **não** por borda e cartão. Um painel dentro
  de um painel dentro de um cartão é sinal de que faltou ar, não de que faltou caixa.

## Movimento

Os tokens de duração já existiam e continuam bons:

```css
--dur-micro: 140ms;   /* hover, press, troca de aba */
--dur-panel: 220ms;   /* modal, drawer, troca de view */
--ease:        cubic-bezier(.2,.8,.2,1);    /* padrão */
--ease-spring: cubic-bezier(.32,.72,0,1);   /* entrada de painel e sheet — a curva iOS */
```

`--ease-spring` é para **entrada** de painel/sheet/modal, não para hover. Movimento é
função: comunica de onde a coisa veio. Se não comunica nada, não anima.

`prefers-reduced-motion: reduce` já é respeitado globalmente por um bloco `!important`
no fim do `globals.css` — qualquer animação nova é coberta automaticamente. Não
reintroduza animação em `style` inline, que escapa dele.

---

## O que ainda falta (não feito nesta passada)

1. **Varredura dos `*.module.css`** das features (≈877 valores crus). Cada um vira token.
2. **Restos de semáforo fora da lista acima**: `.flag`, `.chip.*`, `.wk.present/.absent`,
   `.jstep.cur .jdot`, `.tlrow::before`, `.pos`/`.neg`, `.seg button.on`. Mesma regra:
   fundo colorido → ponto + texto.
3. **Ajuste componente a componente**, só depois que 1 e 2 estiverem prontos.
4. Aposentar o bloco v1 e a flag, quando o dono aprovar.
