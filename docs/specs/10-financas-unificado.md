# Spec 10 — Finanças unificado

> Aprovado pelo dono em 2026-10-08. Substitui as telas separadas Financeiro (`/finance`),
> Contabilidade (`/accounting`) e Doações (`/giving`) por um módulo só: **Finanças**.

## Problema
Hoje o dinheiro da igreja vive em 3 lugares que não conversam: `finance_entries` (Financeiro),
`donations` (Doações) e `journal_entries` (Contabilidade). O saldo do tesoureiro, o recibo do
membro e o balancete do contador podem divergir. Banco tem só dado de teste (3 lançamentos,
1 doação, 0 partidas), então dá para reorganizar sem migração de dado real.

## Quem usa
- **Tesoureiro** (voluntário, sem formação contábil): lança entrada, saída, transferência e dízimo.
  Nunca vê "débito/crédito".
- **Contador**: aba própria dentro do módulo, com plano de contas, lançamento manual, balancete e DRE.
- Acesso a tudo: permissão `finance.manage` (igual hoje). RLS do m48/m30 continua sendo a barreira.

## Decisão de arquitetura: um livro só
O motor de partidas dobradas (m48) vira a **única fonte da verdade**.
- **Conta (banco/caixa)** = conta do plano do tipo `asset` sob `1.1 Caixa e Bancos`. Sem tabela nova.
- **Categoria** = conta folha `revenue` (sob `4.1`) ou `expense` (sob `5.1`). Sem tabela nova.
- **Lançamento simples** = 1 `journal_entry` postado com 2 partidas:
  - Entrada: débito na conta, crédito na categoria de receita.
  - Saída: débito na categoria de despesa, crédito na conta.
  - Transferência: débito na conta destino, crédito na conta origem.
- **Dízimo/oferta com doador** = o lançamento de entrada + uma linha em `donations` ligada a ele
  (`donations.journal_entry_id`, coluna nova). Recibos (`donation_receipts`) continuam iguais.
- **Desfazer/excluir** = `void_journal_entry` (o motor já proíbe apagar lançamento postado). Doação
  cujo lançamento está anulado sai das listas e dos totais.
- `finance_entries` e `finance_categories` são **aposentadas**: a UI para de ler/gravar. As tabelas
  não são apagadas (regra de migração: nada destrutivo).

### Banco (migration m61)
1. `donations.journal_entry_id uuid references journal_entries(id) on delete set null`.
2. RPC `record_transaction(p_org, p_kind, p_amount, p_date, p_account, p_counter, p_memo,
   p_fund, p_donor_stick, p_donor_name, p_method)`, `security definer`, checa
   `has_perm(p_org,'finance.manage')`, valida que as contas são da org e do tipo certo para o
   `p_kind` (`in` | `out` | `transfer`), cria entry + 2 linhas, posta, e se houver doador cria a
   doação ligada. Tudo numa transação. Devolve o id do lançamento.
3. Acentos nos nomes do plano padrão (`Dizimos`→`Dízimos`, `Contribuicoes`→`Contribuições`,
   `Patrimonio`→`Patrimônio`, `Doacoes`→`Doações`, `Manutencao`→`Manutenção`, `Missoes`→`Missões`,
   `Salarios`→`Salários`, `Utilidades (agua/luz/internet)`→`Água, luz e internet`), só onde o nome
   ainda é o padrão (não sobrescreve o que a igreja renomeou). Também no `seed_default_chart_of_accounts`.
4. Grants: `revoke from public, anon`; `grant to authenticated`.

## A tela

Rota única **`/finance`** com abas: **Movimentações · Dízimos · Fechamento · Contador**.
`/accounting/*` e `/giving` redirecionam para a aba equivalente. Recibo continua em rota própria
(`/finance/recibo/[id]`, a atual `/giving/receipt/[id]` redireciona).

### Movimentações (abre aqui)
- **Topo:** saldo total grande (número tabular, tracking negativo) e, embaixo, uma linha discreta
  com o saldo de cada conta. Clicar numa conta filtra o extrato por ela.
- **Ação primária única:** botão "Novo lançamento" (atalho `N`).
- **Extrato:** agrupado por dia, filtro de mês (reusa `PeriodFilter`). Cada linha: descrição,
  categoria, conta, valor (verde só em entrada; saída em neutro com sinal −). Sem tabelão.
- **Estado vazio ensina:** "Lance a primeira entrada ou saída" + botão. Se a igreja só tem as contas
  padrão, sugere "Renomeie 'Banco - Conta Corrente' para o nome do seu banco".

### Novo lançamento (painel)
- Desktop: painel lateral que entra e sai **pela direita** (mesmo caminho). Celular: folha que sobe
  de baixo e desce para baixo, com arrastar para fechar.
- Segmento **Entrada · Saída · Transferência**. Valor em número grande, foco automático.
- Campos: categoria (só as do tipo certo), conta (padrão: a última usada), data (padrão: hoje),
  descrição. "+ Nova categoria" e "+ Nova conta" no próprio select.
- Categoria Dízimos ou Ofertas: aparece **"De quem?"** (opcional; busca Stick ou nome livre) e
  "Forma" (Pix, dinheiro...). Preenchido, vira doação e entra no histórico do membro.
- "Mais opções" (recolhido): fundo designado.
- Validação **inline** enquanto digita (valor > 0, conta ≠ destino na transferência). Aviso, não
  bloqueio, se a saída deixa a conta negativa.
- Ao salvar: painel fecha, linha nova entra no extrato com fade curto, toast "Lançamento salvo ·
  **Desfazer**" por ~6s. Desfazer = anular. Sem diálogo de confirmação.
- Clicar numa linha do extrato abre o mesmo painel em modo leitura com "Anular lançamento".

### Dízimos
- Lista por membro no período (quem deu, total, último), busca por nome.
- Clicar no membro: doações dele + "Emitir recibo" (individual ou anual), reaproveitando
  `ReceiptView` e as actions de recibo do Giving.
- Registrar dízimo daqui abre o mesmo painel de Novo lançamento já em Entrada/Dízimos.

### Fechamento
- Escolhe o mês. Mostra: saldo inicial, entradas por categoria, saídas por categoria, saldo final,
  saldo por conta, total de dízimos/ofertas. Linguagem de tesoureiro, não de contador.
- Botão "Imprimir / PDF" usa `window.print()` + CSS `@media print`. Sem biblioteca.

### Contador (só `finance.manage`, recolhida por ser avançada)
- Sub-abas: Plano de contas · Lançamentos · Relatórios (balancete + DRE). Move os componentes atuais
  de `features/accounting` (AccountsBoard, EntriesBoard, EntryEditor, EntryView, ReportsBoard) para
  dentro do módulo, sem mudar o comportamento.
- Lançamentos do tesoureiro aparecem aqui como lançamentos normais (são os mesmos).

## Movimento e acabamento (Emil + Apple)
- Tokens existentes (`--dur-panel`, `--ease`). Painel 200–240ms, saída um pouco mais rápida.
- Botões: `scale(0.97)` no `:active` (feedback no toque, não na soltura).
- Folha do celular: arrastar 1:1 respeitando onde o dedo pegou, fecha por velocidade ou distância,
  resistência ao puxar para cima. Interrompível.
- Saldo **não** anima contando. Número aparece certo na hora.
- Atalho `N` abre sem animação.
- Hover só em `@media (hover: hover)`. `prefers-reduced-motion`: troca slide por fade.
- Claro e escuro em tudo; nenhum controle nativo cru (regra global do `globals.css`).

## Fases (cada uma = 1 commit verde = deploy)
1. **Banco + domínio:** m61, `features/finance` reescrito sobre o livro (queries de saldo por conta,
   extrato, categorias/contas), action `recordTransaction`/`voidTransaction`. Testes do domínio.
2. **Movimentações:** topo de saldos, extrato, painel Novo lançamento (desktop + folha mobile), toast
   Desfazer.
3. **Dízimos:** aba + recibos dentro do módulo; `/giving` redireciona.
4. **Fechamento:** relatório do mês + impressão.
5. **Contador:** aba com os componentes da Contabilidade; `/accounting` redireciona; nav fica com um
   item só ("Finanças"); aposenta `features/giving` e as rotas antigas.

O módulo segue escondido pelo `STUDY_ONLY` até a fase 5. Liberar é decisão do dono.

## Fora desta versão
Importar extrato (OFX/CSV, spec 01), conciliação, orçamento, aprovação de despesa, anexo de
comprovante, multi-moeda.

## Teste
- Unit: domínio (saldo por conta, extrato, fechamento do mês) e validação do schema.
- Integração: `record_transaction` com cada `p_kind`, com doador, e void tirando do saldo.
- `npm run verify` verde em cada fase. QA no navegador seguindo as notas de memória (pane oculto:
  conferir por texto/JS).
