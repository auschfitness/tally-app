# Spec 11 — Finanças: contas bancárias e importação de extrato

> Aprovado pelo dono em 2026-10-08. **Fases A, B e C no ar em 2026-10-08.** Validar com extratos
> reais de bancos (só testado com arquivos montados no formato de cada banco). Referência: Controlle. Substitui a spec 01 (escrita para o
> Financeiro antigo; o parser, a deduplicação por FITID e as regras que aprendem vêm de lá).
> Base: spec 10 (o livro de partidas dobradas é a fonte da verdade).

## Decisões
- Extrato chega por **arquivo** (OFX, OFC, CSV). Conexão automática (Open Finance) fica para depois.
- **Logos oficiais** dos bancos, do pacote `logos-bancos-br` 0.8.0 (MIT; cada logo vem da fonte
  oficial do banco no diretório do Open Finance). Copiadas uma vez para `public/banks/<COMPE>.png`;
  não é dependência. Logos são marcas dos bancos, usadas só para identificar (uso nominativo).
- Conta bancária = conta do plano (`asset` sob 1.1), como na spec 10. Ganha `bank_code` (COMPE),
  `is_default` e saldo inicial (lançamento contra 3.1.01 Saldo Acumulado).

## Fase A — Contas
- Grade de bancos com logo + busca + "Outro banco" + "Dinheiro (caixa físico)".
- Nome livre, saldo inicial com data, estrela de conta padrão (uma por igreja, índice parcial único).
- Renomear, trocar banco, marcar padrão, desativar (só com saldo zero).
- Conta padrão vem escolhida no Novo lançamento e na importação.
- Banco: migration m62 — colunas em `ledger_accounts`, RPCs `set_default_account` e
  `set_opening_balance` (anula o saldo inicial anterior da conta e lança o novo; `reference =
  'saldo_inicial'`).

## Fase B — Importar extrato
- Arrastar arquivo; formato detectado. OFX 1.x (SGML) e 2.x (XML), OFC, CSV com predefinição
  Nubank/Inter e mapeamento manual de colunas para os demais.
- Leitura no navegador; encoding pelo cabeçalho (`CHARSET:1252` → windows-1252), data sem fuso.
- Conta escolhida sozinha pelo `ACCTID` já visto; senão a conta padrão.
- Prévia obrigatória: novas / já importadas. Deduplicação por `(conta, FITID)` (CSV: hash de
  data+valor+descrição+ordem).
- Tabelas `bank_imports`, `bank_transactions` (status pending | classified | ignored, liga ao
  `journal_entry_id`).

## Fase C — Classificar
- Fila de pendentes, mais antigas primeiro; categoria sugerida; lote; ignorar.
- Regras que aprendem (`category_rules`: trecho do texto → categoria), oferecidas ao classificar.
- Vincular a lançamento manual existente (mesma conta e valor, até 3 dias) em vez de duplicar.
- Classificar cria o lançamento via `record_transaction`.

## Sugestão automática (2026-10-08)
- Ordem: regra da pessoa > histórico do mesmo favorecido (até 10% de diferença = "valor
  parecido") > empresas conhecidas (energia, água, telefone, tarifa, aluguel, dízimo, oferta).
- Cada sugestão mostra o porquê. Botão por linha "Sempre" (lembra) / "✓ Sempre" (esquece, a
  categoria da linha fica). "Regras (N)" no topo da fila lista e esquece. Saiu a tela "Lembrar
  para as próximas?" do fim.

## Fora
CNAB 240/400 (cobrança; entra se a igreja emitir boletos).

Open Finance, cartão de crédito/fatura, QIF.
