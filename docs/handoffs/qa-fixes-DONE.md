# QA fixes — DONE (Claude Code, 2026-07-17)

Correções de front do `docs/handoffs/qa-report.md`. Cada item fechou com
`npm run verify` verde (typecheck+lint+**193 testes**+build) + verificação no
navegador (Playwright contra a fixture) + commit. Branch `refactor/nextjs`.

## Feito

### 1. Datas — `dcdb802`
- **Novo `<DateField>` (`src/components/shared/DateField.tsx`)**: campo de data que
  **SEMPRE exibe dd/mm/aaaa**, com máscara ao digitar + calendário nativo (por baixo
  do ícone). Submete/expõe **ISO** (`aaaa-mm-dd`) via `<input hidden name>` (forms de
  Server Action) ou `onChange(iso)` (uso controlado). Trocado nos **9 inputs de data**:
  Sticks (última presença), Care (prazo + contato), Finance (data), Escala (escalar),
  Eventos (data), Séries (início/fim), Sermão (data — controlado).
  - **Por que um componente:** o `<input type="date">` nativo herda o formato do
    **locale do SO** do usuário — não dá pra forçar dd/mm/aaaa por HTML/CSS (o `lang`
    da página já era `pt-BR`, não resolve). Mesmo espírito do `<Select>` temático.
    Decisão do dono: "campo próprio dd/mm/aaaa" (atende igrejas nos EUA também).
  - **Verificado:** exibe dd/mm/aaaa e grava ISO; digitação incremental não é apagada
    no meio nem no modo controlado (SermonEditor).
- **Off-by-one do "hoje" na Escala** (`/teams/schedule`): "hoje" agora vem do **fuso da
  organização** (`app_state.account.timezone`, via `zonedTodayIso`), não do relógio do
  servidor. O SSR roda em **UTC** na Vercel → à noite no Brasil/EUA o servidor já
  virou o dia e destacava o dia SEGUINTE. Verificado: destaca o dia correto no fuso.

### 2. Navegação para o detalhe de grupo — **NÃO REPRODUZ** (nenhum commit)
Investiguei a fundo: `/groups` usa `<Link href="/groups/[id]">` (padrão idiomático do
App Router). Reproduzi com Playwright logado na fixture, em **dev E no build de
produção** (`next build` + `next start`), incluindo com estado de filtro e ida-e-volta
repetida (3×): a URL muda **E** o detalhe renderiza, **sem erros de console**. O
código atual está correto.
- **Hipótese** do que o QA viu: deploy/bundle **obsoleto em cache** na Vercel (soft-nav
  com JS antigo falha; só o reload — que baixa o bundle novo — resolve). Combina com
  "só aparece ao recarregar".
- **Ação sugerida:** re-testar após o próximo deploy (esta rodada já empurrou commits →
  novo build). Se ainda ocorrer com o bundle atual, me mandem os detalhes (qual grupo,
  console) que eu reabro.

### 3. Textos — `4adba9e`
- **"Grupo Grupo de Jovens"**: `groupLabel()` no motor de Signals não duplica "Grupo"
  quando o nome já começa com ele. +teste travando o caso.
- **"Teams"/"Groups" no Inbox** → PT-BR: o item do feed mostra a **origem** via
  `categoryLabel` (reusa os rótulos dos chips: Care, Pessoas, Grupos, Serviço, Cultos,
  Celebrações) em vez do enum cru em inglês. Item e chip dizem a mesma palavra.
- **"1 membros" → "1 membro"**: pluralização de "membro(s)" e "sinalizado(s)" com N=1
  na Saúde dos Grupos.

### 4. Badge do Inbox — `6bee747`
- O contador do nav agora é o nº de **sinais visíveis**, da MESMA fonte da tela /inbox
  (`buildSignalsInput` + `signals` + `visibleSignals`), computado no layout do
  dashboard. Antes era fixo em **0** (mostrava 0 com 4 sinais). Verificado: badge = 4 =
  feed. Badges com valor 0 ficam ocultos (ex.: tarefas) — menos ruído.
- **Custo:** monta o assembler de Signals a cada navegação. Aceitável no porte atual
  (tabelas pequenas). Defensivo: qualquer falha → 0, nunca derruba a casca.
  **Revisitar com cache** (React `cache()`) ou compartilhando o cálculo com a Home se
  o custo pesar em escala.

### Defensivo (pedido do orquestrador) — `de08276`
- `profiles`: `UPDATE` → **`upsert`** de `locale` (`lib/i18n/actions`) e `full_name`
  (`settings/actions`). Auto-cura se a linha do perfil faltar.

## Ainda pendente (fora desta rodada)
- **i18n fatia 3b**: traduzir o resto do app PT/EN/ES (menu lateral + telas). Hoje o
  inglês só traduz Configurações. Não bloqueia; era pra depois.
- **Native date picker popup:** o *calendário* nativo (popup do SO) ainda segue o tema
  do SO; o CAMPO em si é dd/mm/aaaa e temático. Sem ação prevista.
