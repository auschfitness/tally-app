# Giving / Doações (Fase 1)

Ledger de doações **no nível do doador** + emissão de recibos/declarações (BR/US).
**SEM pagamento online** (isso é a Fase 2, do orquestrador). Ver
`docs/handoffs/giving-fase1.md`.

## Acesso (sensível)
Toda a área é gated por **`finance.manage`** (Tesoureiro/Dono). Dado de doador é
sensível (quem deu quanto): o RLS (m30) é a barreira real; `access.ts` + o gate nas
pages/actions escondem a UI e dão erro claro a quem não pode.

## Modelo
- `donations` — ledger por doador: `stick_id` (null = anônimo/avulso), `donor_name`/
  `donor_tax_id` (snapshot/CPF BR), `fund_id` (reusa `funds`), `amount`, `method`,
  `donation_date`, `goods_services_*` (US quid pro quo).
- `donation_receipts` — recibos imutáveis: `kind` (gift|annual), `receipt_no`
  (`next_receipt_number(org)`), `country`, `total_amount`, **`snapshot` jsonb**
  (congela org fiscal + doador + linhas + texto legal no momento da emissão).

## Recibo dirigido pelo país (`organizations.country`)
- **BR**: nome + CPF do doador, CNPJ da igreja. Doação **não é dedutível** no IR —
  recibo = registro/transparência.
- **US (501c3)**: nome/EIN da org + frase de bens/serviços ("No goods or services…"
  quando não houve) + nota de $250. Declaração anual consolida o ano do doador.

A lógica de país é PURA em `receipt.ts` (testada em `domain.test.ts`); a renderização
imprimível em `components/ReceiptView.tsx` (o chrome do app some no `@media print`).

## Relação com Finance Lite
`donations` é o ledger de doador; `finance_entries` segue o ledger geral. **Fase 1 NÃO
sincroniza os dois** (evita contar em dobro) — a igreja registra o giving aqui OU um
total no Financeiro, não ambos para a mesma entrada.

## Fluxo
Registrar (`DonationModal`) → lista/filtro por doador/fundo/período (`GivingBoard`,
reusa `PeriodFilter`) → emitir recibo (por doação ou declaração anual) → recibo relido
do snapshot em `/giving/receipt/[id]`. `timeline_events` na Stick do doador quando há
Stick (sem expor o valor).
