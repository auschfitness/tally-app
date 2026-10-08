# Feature: Finanças

Módulo único de dinheiro da igreja (spec `docs/specs/10-financas-unificado.md`). O livro
de partidas dobradas (m48) é a fonte da verdade; esta feature o lê em linguagem de
tesoureiro: entrada, saída, transferência, saldo por conta.

## Arquivos-chave
- `domain.ts` — puro: `toMovement` (2 partidas → in/out/transfer, resto → other),
  `accountBalances` (saldo das contas finais de caixa/banco, com data de corte),
  `groupByDay`, `monthClose`/`monthBounds` (fechamento: inicial + entradas − saídas +
  outros = final), `leafAccounts`, `nextChildCode`, `isGivingCategory`, `friendlyFinanceError`.
- `queries.ts` — `loadLedger`: plano de contas, lançamentos postados/anulados, partidas,
  doador ligado, fundos, pessoas e moeda numa ida.
- `schema.ts` + `actions.ts` — `recordTransactionAction` (RPC `record_transaction`),
  `voidTransactionAction` (RPC `void_journal_entry`), `createLedgerAccountAction` (conta
  ou categoria nova sob 1.1 / 4.1 / 5.1).
- `components/FinanceBoard.tsx` — casca: período, ação primária, abas por URL
  (`?aba=dizimos`), painel, atalho N, toast com Desfazer.
- `components/MovementsTab.tsx` — saldo, contas (filtro), extrato por dia.
- `components/TithesTab.tsx` — dízimos por pessoa, recibo e declaração anual
  (reusa `features/giving`).
- `components/FinanceTabs.tsx` — abas do módulo (também usadas pela área do contador).
- `components/ClosingTab.tsx` — fechamento do mês (abre no mês passado), imprimir/PDF
  pelo navegador (`@media print` esconde cabeçalho e abas).
- `components/Panel.tsx` — painel lateral (desktop) / folha arrastável (celular).
- `components/TransactionForm.tsx` — Novo lançamento; "De quem?" em dízimo/oferta vira
  doação ligada (`donations.journal_entry_id`).
- `components/MovementDetail.tsx` — detalhe + anular (segundo toque, sem diálogo).

## Banco
- m48 (livro), m49 (plano padrão), m61 (`record_transaction`, `donations.journal_entry_id`,
  acentos no plano padrão).
- `finance_entries` / `finance_categories` estão aposentadas: nada lê nem grava.

## Rota
- `/finance`, `?aba=dizimos`, `?aba=fechamento`; contador em `/finance/contador/*`
  (componentes de `features/accounting`; `/accounting/*` redireciona) (só `finance.manage`); recibo em `/finance/recibo/[id]`. As 5 fases da spec estão prontas; o módulo segue escondido pelo `STUDY_ONLY` até o dono liberar.
