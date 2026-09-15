# Spec 01 — Financeiro: importação bancária (FASE 1, paralelo)

Escopo: `src/features/finance/**`, `src/app/(dashboard)/finance/**`, migrations novas.
Não toque em `accounting/` (é o razão de partidas dobradas, outro módulo, outro agente).

## Onde o módulo está

374 linhas no total. Lançamento manual entrada/saída, categoria e fundo denormalizados em
texto, gráfico de 6 meses, donut de despesa, saldo por fundo. É um caderno digital.

Contra 2311 linhas de `accounting/`. A desproporção é o diagnóstico.

## O que ele precisa virar

O tesoureiro da igreja **não digita lançamento**. Ele exporta o extrato do banco e
classifica. A referência declarada pelo dono é o **Controlle.app**: sobe OFX, tudo aparece,
ele nomeia e categoriza. É esse o alvo.

**Importação fica no plano free.** É ela que vicia o tesoureiro e traz a igreja para dentro.
O que monetiza é relatório, multi-campus e conciliação — não a entrada de dados.

---

## Parte A — Importação OFX

### Por que OFX

Itaú, Bradesco, Banco do Brasil, Santander, Caixa, Nubank, Inter, C6 e Sicredi exportam
OFX, e o formato é o mesmo para todos. Um parser atende o país inteiro. É o caminho mais
curto para o módulo deixar de ser brinquedo.

### Armadilhas reais (leia antes de escolher biblioteca)

- **OFX 1.x é SGML, não XML.** Tags sem fechamento (`<TRNAMT>-50.00` e acabou). Parser XML
  cru falha. Ou use biblioteca que trate SGML, ou normalize para XML antes (fechar tags de
  folha por regex é suficiente e previsível).
- **Encoding.** Bancos brasileiros mandam ISO-8859-1/Windows-1252 com frequência. Detecte
  pelo cabeçalho `CHARSET:` e converta para UTF-8, senão acento vira lixo no memo.
- **Data.** `DTPOSTED` vem `AAAAMMDDHHMMSS[-3:BRT]`. Corte o fuso e guarde só a data —
  hora de banco não significa nada e cria bug de virada de dia.
- **Valor.** `TRNAMT` negativo = saída, positivo = entrada. Vem com ponto decimal.
- **FITID é ouro.** É o identificador único da transação no banco. Use como chave de
  deduplicação: o tesoureiro **vai** subir o mesmo arquivo duas vezes, e isso não pode
  duplicar nada.

Tags que importam: `<STMTTRN>`, `<FITID>`, `<TRNTYPE>`, `<DTPOSTED>`, `<TRNAMT>`,
`<MEMO>`, `<NAME>`, `<CHECKNUM>`. Do cabeçalho: `<ACCTID>`, `<BANKID>`, `<DTSTART>`,
`<DTEND>`, `<LEDGERBAL>`.

Aceite CSV também — Nubank e Inter entregam CSV com menos atrito que OFX, e é uma tela de
mapeamento de coluna, não um parser novo.

### Schema — migration `m52_bank_import`

```sql
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id),
  label text not null,              -- "Itaú — conta da igreja"
  bank_id text,                     -- BANKID do OFX
  acct_id text,                     -- ACCTID (guarde mascarado na UI)
  created_at timestamptz not null default now()
);

create table public.bank_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  filename text not null,
  period_start date, period_end date,
  total_rows int not null default 0,
  new_rows int not null default 0,
  duplicate_rows int not null default 0,
  created_by uuid, created_at timestamptz not null default now()
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  import_id uuid references public.bank_imports(id) on delete set null,
  fitid text not null,
  posted_at date not null,
  amount numeric(14,2) not null,     -- negativo = saída
  memo text, payee text, trn_type text,
  status text not null default 'pending',  -- pending | classified | ignored
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bank_account_id, fitid)     -- a trava de deduplicação
);

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  pattern text not null,             -- trecho do memo/payee, case-insensitive
  category_name text not null,
  fund_name text,
  entry_type text not null,          -- 'in' | 'out'
  hits int not null default 0,
  created_at timestamptz not null default now()
);
```

RLS em todas, isolamento por org via `is_org_member`, escrita exigindo `has_perm(org,'finance.edit')`.

### Classificação que aprende

Regra simples bate qualquer IA aqui, e é explicável:

1. Na importação, para cada transação sem classificação, procure `category_rules` cujo
   `pattern` apareça em `memo` ou `payee`. Achou → sugere categoria e fundo, marca como
   sugestão (não confirma sozinho).
2. Quando o usuário classifica na mão, ofereça **"aplicar sempre que aparecer «CEMIG»"**.
   Aceitou → cria a regra. Da segunda importação em diante 80% vem classificado.
3. `hits` para o tesoureiro ver e limpar regra que não serve mais.

Sem modelo, sem chamada externa, sem custo por transação. E o tesoureiro entende o porquê
de cada sugestão — que é o que ele precisa para confiar.

### Telas

`/finance/importar`
- Arrastar arquivo → escolher conta (ou criar) → prévia com contagem
  **novas / duplicadas / ignoradas** antes de confirmar. Nunca importe sem prévia.
- Confirmação grava `bank_transactions` com status `pending`.

`/finance/conciliar` — a tela central do módulo
- Fila das `pending`, mais antiga primeiro.
- Cada linha: data, valor, memo, seletor de categoria, seletor de fundo, botões
  **Classificar** / **Ignorar**.
- Seleção múltipla com classificação em lote — é assim que se limpa 200 linhas.
- Classificar cria o `finance_entries` correspondente e liga por `finance_entry_id`.
- Contador de pendências vai no menu lateral. É o que traz o tesoureiro de volta.

---

## Parte B — Gráficos

O que existe: barras de 6 meses e um donut de despesa. Falta o que o tesoureiro apresenta
em reunião de conselho:

- **Fluxo mensal** — entradas, saídas e resultado, com linha de média móvel de 3 meses.
- **Comparativo ano a ano** — este mês contra o mesmo mês do ano anterior. É o número que
  a liderança pergunta.
- **Despesa por categoria ao longo do tempo** — barra empilhada, 12 meses. Mostra a
  categoria que está crescendo sem ninguém notar.
- **Saldo acumulado por fundo** — linha, não só o número de hoje.
- **Previsto vs realizado**, quando houver orçamento (pode ficar para rodada seguinte).

Regras: sem dado ilustrativo (DNA #2); mês sem histórico mostra estado vazio explicando o
porquê. Toda cor de gráfico sai dos tokens da Fase 0 — a paleta atual `FINPAL` tem 8 cores
saturadas e é parte do problema visual; reduza para 5 e derive dos tokens.

Exportar CSV e PDF do período filtrado. Igreja precisa disso para assembleia.

---

## Flags

```
finance.ofx_import   importação + conciliação
finance.v2           gráficos novos
```

## Pronto quando

- [ ] OFX real de pelo menos 3 bancos diferentes importa sem erro (peça arquivos ao dono)
- [ ] subir o mesmo arquivo duas vezes gera zero duplicata
- [ ] acento correto em memo de arquivo ISO-8859-1
- [ ] classificação em lote funciona com 200+ linhas sem travar
- [ ] regra criada na mão classifica sozinha na importação seguinte
- [ ] `npm run verify` verde, teste de unidade no parser com fixture de cada banco
