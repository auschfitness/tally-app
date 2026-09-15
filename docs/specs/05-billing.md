# Spec 05 — Cobrança (FASE 2, serial, depois da Fase 1)

Escopo: `src/features/plans/**`, `src/features/billing/**` (novo), webhook, `/admin`.

## O buraco

`src/features/plans/catalog.ts`, plano `pro`:

```ts
priceHint: "Em breve",
```

O feature-gating está pronto e bem feito. O que não existe é o caminho do dinheiro:
nenhuma dependência de pagamento no `package.json`, nenhum checkout, nenhum webhook.
`organizations.plan` só muda por SQL manual.

**Este é o único item do projeto que separa o Tally de faturar.** Tudo mais é melhoria.

## Trilho de pagamento

Brasil primeiro, EUA depois — então o critério é Pix recorrente e boleto, não só cartão.
Avaliar Asaas, Iugu e Pagar.me; Stripe entra na fase EUA e convive (um `provider` na
tabela resolve). Decisão do dono; o código não deve amarrar em um só.

Atalho legítimo para começar a faturar em dias em vez de semanas: plataforma de checkout
pronta (Kiwify, Cakto, Hotmart) com assinatura, e webhook virando `organizations.plan`.
Taxa maior, integração de um dia. Troca-se depois sem refazer o app, porque o ponto de
contato é um só.

## Schema — `m53_billing`

```sql
alter table public.organizations
  add column trial_ends_at timestamptz,
  add column plan_status text not null default 'trial';  -- trial|active|past_due|canceled

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  plan_code text not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create table public.billing_events (
  id bigserial primary key,
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  unique (provider, event_id)      -- idempotência do webhook
);
```

## Webhook — as três regras que evitam prejuízo

1. **Valide a assinatura** do provedor. Endpoint de billing sem verificação de assinatura
   é qualquer um ligando o plano pro de graça.
2. **Idempotência.** Provedor reenvia. `billing_events.event_id` único, processa uma vez.
3. **Service role só no servidor.** A rota do webhook é a única que usa a chave de serviço,
   nunca o client. Escreva isso no `CLAUDE.md`.

Fluxo: pagamento confirmado → `subscriptions` → `organizations.plan='pro'`,
`plan_status='active'`. Falha ou cancelamento → `past_due`/`canceled` e, passado o prazo
de tolerância, volta para `free` — e `app/suspensa` (que já existe) ganha uso.

## Trial

14 dias com o Pro liberado, sem cartão. O gate já existe; falta ler `trial_ends_at`:
`planAllows()` retorna pro enquanto o trial estiver vivo. Aviso discreto a partir do
terceiro dia restante. Terminado o trial, cai para free — **sem perder dado nenhum**.
Igreja que perde histórico fala mal, e nesse mercado a fama corre.

## Preço

Sai do `priceHint`. Referência de faturamento: R$10k/mês são 34 igrejas a R$297 ou 51 a
R$197. Ofereça anual com desconto — antecipa caixa, que é o que resolve o mês 1.

Página pública de preço com comparação free × pro, alimentada pelo `catalog.ts` que já
existe. Não duplique a lista de features em HTML.

## Admin

`m50_admin_set_org_plan` já existe. Falta a tela: buscar org, ver plano, status, trial,
assinatura, e poder conceder plano manualmente (igreja piloto, parceiro, teste). Registre
quem concedeu e por quê.

## Pronto quando

- [ ] checkout real leva do free ao pro sem intervenção manual
- [ ] webhook com assinatura validada e idempotente (reenviar o mesmo evento não faz nada)
- [ ] trial de 14 dias abre e fecha sozinho, sem perda de dado
- [ ] cancelamento derruba para free depois da tolerância
- [ ] página de preço no ar, lendo do catálogo
- [ ] `npm run verify` verde
