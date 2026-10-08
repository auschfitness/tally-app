# Spec 12 — Finanças: contas a pagar e a receber, "Resolver" e comprovantes

> Aprovado pelo dono em 2026-10-08. **Fases A e B no ar em 2026-10-08** (m64). Referência: webinar do Controlle
> (botão "Resolver", anexos, edição de conta fixa "só este / este e os próximos / todos").
> Base: spec 10 (livro de partidas dobradas é a fonte da verdade) e spec 11 (contas e extrato).
> Visual: `docs/design-principles.md` (governa) + régua 4d (`docs/design-tokens.md`) + princípios de movimento Emil Kowalski / Apple
> (seção "Movimento e toque" abaixo). Sem biblioteca nova: só CSS e os tokens que já existem.

## Por que
Hoje o Mercy só registra o que **já aconteceu**. O tesoureiro não tem onde guardar "a conta de luz
vence dia 15", nem o boleto em PDF. O resultado: planilha paralela ou papel na gaveta.
Esta spec resolve três coisas, nesta ordem de valor:
1. Ver o que vence na semana e pagar com um toque (**Resolver**).
2. Guardar o comprovante junto do lançamento.
3. Conta que se repete todo mês, com valor que muda (luz, água).

## Decisões
- **Compromisso ≠ lançamento.** Uma conta a pagar/receber é uma *promessa* (tabela nova
  `finance_bills`). Ela **não** toca o livro. Só quando é paga vira lançamento, pela
  `record_transaction` de sempre, e guarda o `journal_entry_id`. O livro continua a única
  verdade sobre dinheiro que se moveu; Fechamento e Contador não mudam.
- Recorrência **materializada**: ao criar uma conta fixa, gerar as ocorrências dos próximos
  12 meses (ou até a data de término). Um job não é necessário: ao abrir Finanças, se a série
  tem menos de 6 meses à frente, completa até 12 (função idempotente `extend_bill_series`).
  Motivo: lista e edição "este e os próximos" ficam triviais, sem cálculo de regra na tela.
- Comprovantes no **Supabase Storage**, bucket privado `finance-files`, caminho
  `<org_id>/<uuid>.<ext>`. Acesso por URL assinada de 5 min. Primeira vez que o app usa Storage.
- Nada de Open Finance, cartão de crédito, juros/multa automáticos (fica para a spec 13).

## Banco (migration m64; `finance_files` e o bucket entram na fase C, m65)
```
finance_bill_series (id, org_id, kind 'in'|'out', description, amount, category_id → ledger_accounts,
                     account_id → ledger_accounts (conta que paga/recebe, opcional),
                     frequency 'monthly'|'weekly'|'yearly', day_of_month int null,
                     starts_on date, ends_on date null, created_by, created_at)

finance_bills       (id, org_id, series_id null, kind, description, amount numeric(12,2) > 0,
                     due_date date, category_id, account_id null, payee text null, notes text null,
                     status 'open'|'paid'|'canceled', paid_at date null, paid_amount numeric null,
                     journal_entry_id null → journal_entries, created_by, created_at, updated_at)
                     índice (org_id, status, due_date)

finance_files       (id, org_id, bill_id null, journal_entry_id null, path, name, mime, size,
                     created_by, created_at)
                     check: bill_id ou journal_entry_id preenchido
```
- RLS igual às tabelas de Finanças (membro da org com `finance.view` lê; `finance.manage` escreve).
- Bucket `finance-files` privado; policy de storage: primeiro segmento do caminho = org do usuário.
- Arquivo: PDF, JPG, PNG, HEIC/WEBP; até 10 MB; até 5 por item.
- RPCs:
  - `pay_bill(p_bill, p_date, p_account, p_amount)` → chama `record_transaction`, marca `paid`,
    grava `journal_entry_id`, e **move os anexos da conta para o lançamento também** (mesmo
    arquivo, duas ligações: a conta paga continua mostrando o boleto). Pagar valor diferente do
    previsto é permitido (luz veio mais cara).
  - `unpay_bill(p_bill)` → anula o lançamento (`void_journal_entry`) e volta para `open`.
    É o "desfazer" do Resolver.
  - `update_bill_scope(p_bill, p_scope 'one'|'following'|'all', campos…)` → altera só esta,
    esta e as próximas **abertas**, ou todas as **abertas** da série. Pagas nunca mudam.
  - `extend_bill_series(p_org)` → completa ocorrências até 12 meses.
- Conta paga pelo extrato importado: na fila de Classificar (spec 11), além de "vincular a
  lançamento manual", oferecer **"É a conta de luz de 15/10?"** quando existir conta aberta da
  mesma direção, valor até 10% de diferença e vencimento a ±5 dias. Aceitar = `pay_bill` com a
  data e o valor do extrato.

## Telas

### 1. Faixa "Esta semana" no topo de Movimentações
Primeira coisa que o tesoureiro vê ao abrir Finanças. Dois cartões lado a lado (um embaixo do
outro no celular):

```
┌ A pagar esta semana ─────────────┐ ┌ A receber esta semana ───────────┐
│ R$ 1.240,00  ·  4 contas          │ │ R$ 300,00  ·  1 conta            │
│ 2 vencidas                        │ │                                  │
│                        [Resolver] │ │                        [Resolver] │
└───────────────────────────────────┘ └──────────────────────────────────┘
```
- "Semana" = vencidas + hoje até domingo. Vencidas contam no total e aparecem em vermelho
  (`--red`) só no texto "2 vencidas", nunca no cartão inteiro.
- Cartão vazio: "Nada vence esta semana" em `--text-2`, sem botão. Não esconder o cartão
  (lugar fixo = previsível). A faixa inteira só aparece se a igreja já cadastrou alguma conta
  (quem não usa contas a pagar não vê dois cartões vazios para sempre).
- Número em `--t-22`, `tabular-nums`, peso 600.

### 2. Folha "Resolver"
Abre por cima (folha que sobe no celular, painel lateral direito no computador, o mesmo
`Panel.tsx` já usado em Finanças). Lista as contas da semana, vencidas primeiro, depois por data.

Cada linha:
```
○  Energia — Celesc            vence hoje        R$ 412,30   📎   [Pagar]
```
- Círculo vazio = aberta; ao pagar, enche (verde para receber, cor do texto para pagar; vermelho
  fica reservado para atraso). Mesmo sinal que vai para a lista de Movimentações.
- 📎 aparece só se houver anexo; tocar abre o arquivo (PDF/imagem) numa pré-visualização dentro
  da folha, com botão "Copiar código" quando o anexo for boleto e a linha digitável tiver sido
  colada em `notes` (detectar 47/48 dígitos). Não fazer OCR de boleto.
- **Pagar** (um toque): paga com valor previsto, data de hoje e conta padrão. A linha não some
  na hora: o círculo enche, o texto vai para `--text-2` e aparece "Pago · Desfazer" por 5 s;
  depois a linha recolhe. Desfazer = `unpay_bill`.
- Tocar na linha (fora do botão) abre o detalhe para pagar com outro valor/data/conta ou anexar.
- Fim da lista: "Tudo resolvido por esta semana." quando zerar. Sem confete.

### 3. Aba nova "A pagar e receber"
Entre Movimentações e Dízimos: `/finance?aba=contas`. Lista de compromissos abertos agrupados
por semana ("Esta semana", "Próxima semana", "Outubro", "Novembro"…), filtro Pagar/Receber/Tudo,
e "Pagas" recolhido no fim. Botão "Nova conta".

### 4. Formulário "Nova conta"
Reaproveita o `TransactionForm` (mesmos campos de categoria e conta) com:
- Pagar / Receber (segmento, igual ao do lançamento).
- Descrição, valor, vencimento, categoria, conta (padrão já escolhida), favorecido (opcional).
- **Repete**: Não · Todo mês · Toda semana · Todo ano; se repete, "até" (opcional, data).
- Anexos (seção 6).
- Observações (onde se cola a linha digitável/chave Pix).

### 5. Editar conta de uma série
Ao salvar mudança em conta que pertence a série, perguntar **antes** de gravar, num menu
ancorado no botão Salvar (não modal no meio da tela):
```
Aplicar a mudança em:
  Só esta conta
  Esta e as próximas
  Todas as abertas
```
Se a série não tiver próximas abertas, não perguntar. Excluir segue a mesma pergunta.

### 6. Comprovantes (contas e lançamentos)
- No detalhe do lançamento (`MovementDetail`) e da conta: área "Comprovantes".
- Computador: arrastar arquivo ou clicar. Celular: botão "Fotografar ou escolher"
  (`<input type="file" accept="image/*,application/pdf" capture="environment">`, nativo).
- Imagem: reduzir no navegador para no máximo 2000 px de lado, JPEG 0,85, antes de subir.
- Miniatura 48×48 (`--r-6`); PDF mostra ícone + nome. Tocar abre pré-visualização.
- Excluir anexo pede confirmação (é irreversível); excluir pelo ícone de lixeira, não por gesto.
- Em Movimentações, linha com anexo ganha 📎 discreto em `--text-2`.

## Movimento e toque (Emil + Apple)
Tudo com os tokens que já existem: `--ease` (ease-out forte), `--ease-spring` (curva de gaveta
iOS), `--dur-micro` 140 ms, `--dur-panel` 220 ms, `--ease-press`.

| Elemento | Comportamento | Por quê |
|---|---|---|
| Botão Pagar / Resolver | `:active { transform: scale(.97) }`, 120 ms `--ease-press`; feedback no *pointerdown* | Resposta imediata ao toque (Apple §1, Emil "buttons must feel responsive") |
| Folha Resolver (celular) | sobe de `translateY(100%)`, 260 ms `--ease-spring`; desce pelo mesmo caminho, mais rápido (180 ms) | Entra e sai pelo mesmo lugar; saída mais rápida que entrada |
| Painel Resolver (computador) | entra da direita `translateX(16px)` + opacidade, `--dur-panel` `--ease`; sem fundo escurecido | Tarefa paralela, não bloqueia; não precisa de véu |
| Arrastar a folha para baixo | acompanha o dedo 1:1 (`setPointerCapture`), fecha se passar 30% **ou** se o gesto for rápido (velocidade > 0,11 px/ms); acima do topo, resistência elástica | Movimento direto; um peteleco basta |
| Círculo ao pagar | preenche com `transform: scale(.6)→1` + opacidade, 140 ms `--ease`; nunca de `scale(0)` | Confirma a ação sem festa |
| Linha paga recolhendo | após 5 s: opacidade → 0 (140 ms), depois altura recolhe (180 ms `--ease`) | Some sem pular a lista |
| Menu "Aplicar a mudança em" | escala de `.96` + opacidade a partir do botão (`transform-origin` no botão), 160 ms | Popover nasce de quem o chamou |
| Pré-visualização de anexo | da miniatura para o centro, opacidade + `scale(.96→1)`, 200 ms | Continuidade espacial |
| Contadores dos cartões | **sem** animação de número | Visto dezenas de vezes por dia; animação vira atraso |
| Hover em linhas | só sob `@media (hover:hover) and (pointer:fine)`, troca de fundo 100 ms | Toque não "gruda" hover |

- `prefers-reduced-motion: reduce`: folha e painel viram só opacidade 150 ms; nada de deslizar
  nem escala. Círculo enche sem escala.
- Animar só `transform` e `opacity` (exceção: o recolher de altura da linha paga, curto).
- Transições CSS, não `@keyframes`, em tudo que pode ser interrompido (pagar e desfazer rápido).
- Nada nativo do Windows: barra de rolagem e seletor seguem a regra global do `globals.css`.

## Texto (sem jargão contábil)
"A pagar", "A receber", "Vence hoje", "Venceu há 3 dias", "Pago", "Recebido", "Desfazer",
"Comprovantes". Nunca "título", "provisão", "liquidação".

## Fases
- **A — Banco e aba**: m64, RPCs, aba "A pagar e receber", formulário com repetição, edição com
  escopo. Testes de domínio: geração de ocorrências (31 de mês curto cai no último dia),
  escopo "esta e as próximas" não toca pagas, `pay_bill` com valor diferente.
- **B — Resolver**: faixa "Esta semana" + folha/painel + pagar em um toque + desfazer.
- **C — Comprovantes**: bucket, `finance_files`, upload/pré-visualização em conta e lançamento,
  📎 nas listas, anexo segue a conta para o lançamento ao pagar.
- **D — Ligação com o extrato**: sugestão "É a conta de X?" na fila de Classificar.

Cada fase: `npm run verify` verde, QA logado com spec Playwright temporária (celular 375 px e
computador), README da feature atualizado.

## Fora (spec 13 ou depois)
Juros/multa/desconto automáticos, cartão de crédito e fatura, edição direto na linha da lista,
centro de custo, fornecedor por CNPJ, Open Finance, OCR de boleto, lembrete por e-mail/push.
