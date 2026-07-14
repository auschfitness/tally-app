# Feature: Finance Lite

Entradas/saídas do mês, gráficos (6 meses + despesas por categoria), saldo por
fundo, lançamentos e novo lançamento. Contra a tabela `finance_entries`.

## Arquivos-chave
- `domain.ts` — interface pública: `FinanceEntry`, `expenseByCat`, `financeMonthly`,
  `fundBalances`, `FINPAL`. Portados de `derived.js`.
- `queries.ts` — `listEntries` (finance_entries + campus), `listFunds` (tabela funds),
  `listCategories` (finance_categories por tipo in/out).
- `schema.ts` + `actions.ts` — criar lançamento (com categoria nova opcional →
  finance_categories) e excluir. Valida → sessão/org → Supabase → revalidate.
- `components/FinanceBoard.tsx` — ministrip, gráficos (barras CSS + donut), tabela,
  saldo por fundo, filtro por categoria, modal.
- `components/EntryModal.tsx` — novo lançamento (segmento entrada/saída, categorias
  por tipo, "+ Nova categoria", fundo, campus).
- `finance.module.css` — barras de 6 meses e linhas de fundo (estilos da feature).
- Usa `components/shared/ConicDonut` (donut CSS reutilizável) e `lib/utils/money`.

## Tabelas Supabase
- `finance_entries` (type, description, category_name/id, fund_name/id, amount,
  entry_date, campus_id). Categoria/fundo seguem denormalizados em texto (category_id/
  fund_id null — normalização é rodada futura, como no legado).
- `finance_categories` (name, type) e `funds` (name) — fontes dos selects.

## Rota
- `/finance` (filtro de campus por querystring `campus`).

## Paridade — mudança consciente (alinhada ao DNA #2 "dados antes da UI")
- **Sem dados ilustrativos**: o app legado PREENCHIA meses sem histórico com números
  fictícios no gráfico "Entradas vs Saídas" (baseIn/baseEx + fatores). Aqui o gráfico
  mostra **só somas reais** — meses sem lançamento ficam em zero. É a direção que o
  próprio CLAUDE.md (#DNA 2) pede ("troque por dados reais"). O restante (saldo por
  fundo, despesas por categoria) já era real e segue igual.
- Categoria e fundo continuam denormalizados no lançamento (texto), como no schema atual.
- "Nova categoria" agora grava em `finance_categories` (antes ia pro blob app_state).
