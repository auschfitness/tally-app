# Spec 00 — Fundação (FASE 0, serial, bloqueia tudo)

Um agente, sozinho. Ninguém mexe em feature enquanto isto não estiver na `main`.

Entrega três coisas: **feature flags**, **sistema de design** e **renomeação dos módulos**.

---

## Parte A — Feature flags

### O problema

Hoje existe `src/features/plans/` (gate comercial: pagou / não pagou). Não existe gate de
maturidade (pronto / em obra). Sem isso, remodelar um módulo grande significa deixar o app
quebrado em produção por semanas, ou trabalhar em branch longa que depois não faz merge.

Flag e plano são **coisas diferentes e ortogonais**:

| | pergunta | quem decide | onde vive |
|---|---|---|---|
| **Flag** | está pronto? | você | `feature_flags` (por org, com default global) |
| **Plano** | pagou? | o cliente | `organizations.plan` (já existe) |

Um módulo só aparece se **flag ligada E plano permite**. Nessa ordem.

### Implementação

**Migration** `m51_feature_flags`:

```sql
create table public.feature_flags (
  key          text primary key,            -- 'finance.ofx_import'
  description  text not null,
  enabled      boolean not null default false,  -- default global
  rollout      text not null default 'off',     -- 'off' | 'orgs' | 'all'
  created_at   timestamptz not null default now()
);

create table public.feature_flag_orgs (
  flag_key text not null references public.feature_flags(key) on delete cascade,
  org_id   uuid not null references public.organizations(id) on delete cascade,
  enabled  boolean not null default true,
  primary key (flag_key, org_id)
);
```

RLS: leitura liberada para membro da org (precisa saber o que renderizar); escrita só para
platform admin (reaproveite o mecanismo de `m47_platform_admin`).

Função SQL `public.flag_on(p_key text, p_org uuid) returns boolean`, SECURITY DEFINER:
override por org vence; senão `rollout='all'` → `enabled`; senão false.

**Código** — `src/features/flags/`, espelhando a estrutura de `plans/`:

- `catalog.ts` — o registro tipado. Fonte da verdade das chaves:

```ts
export type FlagKey =
  | "finance.ofx_import"
  | "finance.v2"
  | "study.bible_v2"
  | "study.interlinear"
  | "teams.v2"
  | "groups.v2"
  | "billing.checkout"
  | "ui.design_v2";
```

- `gate.ts` — `flagOn(ctx, key): boolean`, síncrono, lendo do `OrgContext` (carregue todas
  as flags da org uma vez por request no `session.ts`, não uma query por flag).
- `gatedLayout.tsx` — espelha o de `plans/`. Flag off → 404, **não** upsell. Feature em obra
  não existe para o usuário; feature não paga existe e vende.
- Componente `<Flagged flag="x">` para trechos dentro de tela já existente.

**Ordem do gate**, sempre: `flagOn()` primeiro, `planAllows()` depois.

**Regra**: toda flag nasce `rollout='off'`. Ligar para a sua própria org de teste
(`feature_flag_orgs`), validar, depois `'all'`.

**Painel**: adicione uma aba em `/admin` listando flags com toggle e busca de org. Sem isso
você vira refém de SQL manual.

---

## Parte B — Sistema de design

### Diagnóstico (não é achismo, está no `globals.css`)

O visual passa "feito por IA" por seis motivos concretos:

1. **Poppins.** É a fonte geométrica arredondada que todo template e todo gerador usa.
   Sozinha ela já entrega o jogo. Apple não usa nada parecido.
2. **Semáforo.** `.hb.healthy/.attention/.risk`, `.engbar > i.healthy/...`, `.stat.alert`.
   Pílulas e barras verde/laranja/vermelho são a assinatura número um de dashboard gerado.
3. **Raios sem escala.** 6, 8, 9, 10, 16, 18, 20px convivendo. O olho lê como descuido.
4. **Tipografia sem escala.** 11, 12, 12.5, 13, 13.5, 14, 15, 20, 24, 26px — inclusive meio
   pixel. Não existe sistema, existe chute por tela.
5. **Sombras ad-hoc.** Três combinações diferentes de `box-shadow` no mesmo arquivo.
6. **Cor como decoração**, não como significado. Quatro cores saturadas competindo.

O erro seria "colocar mais efeito". Apple é o contrário: **menos cor, menos caixa, mais ar,
tipografia fazendo o trabalho**. Efeito entra só onde comunica estado.

### `docs/design-tokens.md` — criar, e ele passa a governar

**Tipografia.** Troque Poppins pela stack de sistema (é o que dá o "cheiro" Apple de graça,
e ainda remove um webfont do carregamento):

```css
--font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable",
           "Inter", system-ui, sans-serif;
```

Escala fechada, sem valor fora dela e sem meio pixel:

```
--t-11  11px / 16   rótulo, caption
--t-13  13px / 18   secundário, meta
--t-15  15px / 22   corpo (era 14 — sobe, Apple é mais respirado)
--t-17  17px / 24   título de painel
--t-22  22px / 28   título de tela
--t-28  28px / 34   número de destaque
--t-34  34px / 40   número herói
```

Pesos: 400 corpo, 500 ênfase, 600 título. Nunca 700.
`letter-spacing: -0.01em` em ≥22px. Números sempre `font-variant-numeric: tabular-nums`.

**Raios** — quatro valores, só:

```
--r-6   controle pequeno (chip, tag)
--r-10  botão, input
--r-14  cartão, painel
--r-20  modal, sheet
```

**Elevação** — dois níveis, sutis. Apple usa borda antes de sombra:

```
--e-1  0 1px 2px rgba(16,24,40,.05)
--e-2  0 8px 24px rgba(16,24,40,.08)
```

**Cor** — um acento. O azul da marca (#2B5CE6) permanece, e é o **único** fill colorido
da interface. Verde, laranja e coral deixam de ser fundo e viram **texto e ponto**:

```
Antes:  <span class="hb risk">Risco</span>        pílula vermelha preenchida
Depois: <span class="status"><i data-tone="risk"></i>Precisa de atenção</span>
        ponto de 6px + texto na cor do corpo
```

Essa única troca remove ~80% da cara de IA. Aplique em `.hb`, `.engbar`, `.stat.alert`,
`.gbar` e em toda barra de saúde.

Neutros com leve viés frio, contraste alto no texto. Cinza é o material da interface;
cor é exceção.

**Ar.** Grid base de 4px. Padding de cartão sobe de 16 para 20. `.cards` de 4 colunas
fixas passa a `repeat(auto-fit, minmax(200px, 1fr))`.

**Movimento.** Os tokens já existem (`--dur-micro` 140ms, `--dur-panel` 220ms) e estão bons.
Acrescente `--ease-spring: cubic-bezier(.32,.72,0,1)` para entrada de painel e sheet — é a
curva que dá a sensação iOS. Respeite `prefers-reduced-motion`.

### Como aplicar sem quebrar

Atrás da flag `ui.design_v2`:

1. Redefina os tokens em `globals.css`. As classes existentes passam a consumir os novos
   valores — 70% do ganho vem só disso, sem tocar em componente.
2. Troque a fonte.
3. Substitua as classes de semáforo por `.status` + ponto.
4. Varra `*.module.css` das features atrás de valor cru (px, hex, sombra) e troque por token.
   `grep -rEn "#[0-9a-fA-F]{6}|[0-9]+px" src/features/**/*.module.css` dá a lista.
5. Só então ajuste componente a componente.

**Critério de pronto:** nenhum hex e nenhum px fora de token em `src/features/**/*.module.css`.

---

## Parte C — Nomes dos módulos

Regra: o nome diz **o que o pastor ganha**, não o conceito interno. Termos de produto do
Tally (Stick, Signal, Care, Journey, Inbox, Timeline) ficam; nome genérico de menu muda.

Proposta para `src/config/nav.ts` — leve ao dono para aprovar **antes** de aplicar:

| hoje | proposta | por quê |
|---|---|---|
| Finance Lite | Financeiro | "Lite" comunica limitação num módulo que vai crescer |
| Accounting | Contabilidade | inglês solto na UI PT-BR |
| Teams | Escalas | é o que o líder vem fazer |
| Groups | Células | palavra que a igreja brasileira usa |
| Spaces | Espaços | idem |
| Study | Estudo | idem |
| Giving | Doações | idem |
| Tracks | Trilhas | idem |

Chave de rota e pasta **não mudam** (`/teams`, `features/teams`). Só o rótulo. Renomear
pasta agora destrói o histórico do git e trava os agentes da Fase 1.

---

## Pronto quando

- [ ] `npm run verify` verde
- [ ] flags criadas, aba no `/admin` funcionando, todas as chaves do catálogo registradas
- [ ] `docs/design-tokens.md` escrito
- [ ] zero hex e zero px fora de token em `src/features/**/*.module.css`
- [ ] `ui.design_v2` ligada só na org de teste
- [ ] `CLAUDE.md` limpo: a seção histórica do app Vite aposentado sai (ela é carregada em
      toda sessão, para sempre, e não descreve mais o código)
