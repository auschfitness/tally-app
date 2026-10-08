# Feature: Giving (recibos de doação)

Desde a spec 10 (Finanças unificado) não há tela própria: a lista por pessoa vive na aba
**Dízimos** de `/finance` (`features/finance/components/TithesTab.tsx`) e a doação nasce
como lançamento de Finanças (`record_transaction`, com `donations.journal_entry_id`).
Esta pasta guarda o que é de recibo e de doador.

## Arquivos-chave
- `domain.ts` — puro: método, totais por fundo/doador (`donorTotals`, `donorKey`), ano.
- `receipt.ts` — regras de recibo BR/US (texto legal, endereço, snapshot).
- `queries.ts` — doações (ignora as de lançamento anulado), recibos, bloco fiscal.
- `actions.ts` — `issueGiftReceipt`, `issueAnnualReceipt` (número sequencial +
  snapshot imutável em `donation_receipts`).
- `components/ReceiptView.tsx` — recibo para imprimir, em `/finance/recibo/[id]`.

## Rotas antigas
- `/giving` → `/finance?aba=dizimos`; `/giving/receipt/[id]` → `/finance/recibo/[id]`.
