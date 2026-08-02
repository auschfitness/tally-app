# Planos + travas de recurso (feature-gating) — Design

**Data:** 2026-08-01
**Autor:** Claude Code (front) — aprovado pelo dono (Gaybiel)
**Frente:** Planos/assinaturas — Fase 1 (catálogo + travas + admin). **Sem cobrança.**

## Objetivo

Introduzir **planos** no Tally e **travar módulos** conforme o plano da igreja, deixando
tudo pronto para ligar cobrança real (Stripe) numa fase futura — **sem implementar
cobrança agora**. O dono troca o plano de uma igreja manualmente pelo painel `/admin`.

## Não-objetivos (fora desta fase)

- Nenhum provedor de pagamento, checkout, webhook, fatura ou imposto.
- Nenhum limite por tamanho (número de pessoas). Diferenciação é **só por recursos**.
- Nenhum autoatendimento de upgrade pelo cliente (não há como "pagar" ainda).
- Plano-gating **não é fronteira de segurança** — ver "Modelo de segurança".

## Decisão de produto (aprovada pelo dono)

**2 planos, diferenciados por módulos liberados:**

- **🌱 Free — "Comunidade"** (o coração pastoral): Home, Inbox, Sticks, Grupos, Cultos/
  presença, Oração, Journey, Trilhas, Agenda, Care + Signals, Coordenação.
- **⭐ Pro — "Igreja"** (a operação): tudo do Free **+** Financeiro (Finance Lite,
  Contabilidade, Doações), Comunicação (Espaços, Mensagens/DM, Chat), Estudo (sermões +
  estudo bíblico), Times (ministérios + escala), Eventos, contas de membro/convites.

História de venda: **de graça pra pastorear; paga pra operar.**

### Mapa módulo → recurso travado (fonte da verdade)

Cada item de menu recebe (ou não) uma chave de recurso. Sem chave = **sempre liberado**
(núcleo). Com chave = liberado só se o plano da igreja incluir aquele recurso.

| Chave (`FeatureKey`) | Módulos / rotas | Free | Pro |
|---|---|---|---|
| `finance` | Finance Lite `/finance` | 🔒 | ✅ |
| `accounting` | Contabilidade `/accounting` | 🔒 | ✅ |
| `giving` | Doações `/giving` | 🔒 | ✅ |
| `communication` | Espaços `/spaces`, Mensagens `/dm` | 🔒 | ✅ |
| `study` | Estudo `/study` (sermões + bíblia) | 🔒 | ✅ |
| `teams` | Times `/teams` (+ escala) | 🔒 | ✅ |
| `events` | Eventos `/events` | 🔒 | ✅ |
| `members` | Membros/convites `/members` | 🔒 | ✅ |
| — (núcleo) | Home, Inbox, Sticks, Grupos, Cultos, Oração, Journey, Trilhas, Agenda, Care, Coordenação | ✅ | ✅ |

> Casos de borda decididos: **Trilhas** e **Coordenação** ficam no núcleo (Free) — são
> leves e pastorais. **Membros/convites** é Pro (faz par com Comunicação). Ajustável no
> catálogo de código sem migração.

## Arquitetura

### 1. Catálogo em código (sem tabela nova)

O único estado no banco é `organizations.plan` (text, default `'free'`, já existe — m47).
O **catálogo** (quais recursos cada plano libera, nome, tagline, dica de preço) vive num
arquivo de código versionado — fácil de editar; quando ligarmos o Stripe, cada plano já
carrega o gancho do preço.

`src/features/plans/catalog.ts` (nova feature `plans/`):

```ts
export type PlanCode = "free" | "pro";
export type FeatureKey =
  | "finance" | "accounting" | "giving" | "communication"
  | "study" | "teams" | "events" | "members";

export interface Plan {
  code: PlanCode;
  name: string;        // "Comunidade" / "Igreja"
  tagline: string;     // frase de marketing
  priceHint: string;   // ex.: "Grátis" / "Em breve" (gancho p/ Stripe depois)
  features: FeatureKey[]; // recursos travados que ESTE plano libera
}

export const PLANS: Record<PlanCode, Plan>;      // free: features []; pro: todas
export const PLAN_ORDER: PlanCode[];             // ["free","pro"]
export function asPlanCode(v: string): PlanCode; // desconhecido → "free"
export function planAllows(plan: string, feature: FeatureKey): boolean;
export function requiredPlanFor(feature: FeatureKey): PlanCode; // menor plano que libera
```

`domain` puro (`planAllows`, `asPlanCode`, `requiredPlanFor`) com **testes fortes**
(`catalog.test.ts`) — é a regra que decide o que a igreja vê.

### 2. `plan` no contexto de sessão

`requireOrg()` (em `src/lib/auth/session.ts`) passa a ler `organizations(status, plan)` e
expõe `plan: PlanCode` no `OrgContext`. Uma linha no select + um campo no tipo. Toda
página/ação protegida já passa por aqui, então o plano fica disponível em todo lugar.

### 3. Travas (enforcement)

Plano-gating acontece nos **pontos de entrada da UI** (não em cada action):

- **Menu (`Sidebar`)**: `NavItem` ganha `feature?: FeatureKey`. O Sidebar recebe o
  `plan` (server-passed, como já faz com a visibilidade de admin). Item cujo recurso não
  está no plano aparece com um **cadeado** (marketing: mostra o valor), e leva à página —
  que exibe o upsell. (Mostrar travado > esconder: revela o que a igreja ganha no Pro.)
- **Páginas travadas**: cada rota Pro chama, logo após `requireOrg()`, um helper
  `gateFeature(ctx, feature)`; se o plano não libera, renderiza `<Upsell feature=… />`
  (componente compartilhado: "Este recurso é do plano Igreja") em vez do módulo.
- **Server Actions**: **não** recebem checagem de plano nesta fase (ver segurança). A RLS
  continua garantindo isolamento por org + permissão; o plano é gate comercial, não de
  segurança. Documentar isso nos READMEs dos módulos travados.

Componente `src/features/plans/components/Upsell.tsx` (Server Component puro) + helper
`gateFeature` (server, síncrono) em `src/features/plans/gate.ts`.

### 4. Tela de Planos (vitrine dentro do app)

Aba **"Plano"** no hub `/settings` (ver hub de Administração existente): mostra o plano
atual da igreja em destaque + comparação lado a lado dos dois planos (o que cada um tem),
derivada do catálogo. Como não há autoatendimento, o CTA do Pro é informativo
("Fale com o Tally para migrar") — vitrine pronta pra virar checkout depois. Visível a
qualquer membro (é marketing); a troca de verdade é no `/admin`.

### 5. Admin troca o plano

No `AdminDashboard`, a etiqueta de plano (hoje só-leitura) vira um seletor. Nova action
`setOrgPlanAction(orgId, plan)` (espelha `setOrgStatusAction`): valida formato, re-checa
`isPlatformAdmin`, chama a RPC `admin_set_org_plan`. Revalida `/admin`.

### 6. Banco (única peça de DB — Fase 1)

- **Migração m50** `admin_set_org_plan(p_org uuid, p_plan text)` — SECURITY DEFINER,
  espelha `admin_set_org_status`: valida `p_plan in ('free','pro')`, exige
  `is_platform_admin()` por dentro (barreira real), faz `update organizations set plan`.
  `revoke execute from public/anon; grant to authenticated`. Aplicada via MCP nesta
  sessão **e** salva em `supabase/migrations/`.
- **Grandfather (uma vez):** `update organizations set plan='pro'` nas 5 orgs atuais —
  ninguém perde acesso ao que já usa. Org nova nasce `free` (default da coluna; `create_org`
  não muda).
- Rodar `get_advisors` após a DDL. Sem RLS nova (a função é o caminho de escrita).

## Modelo de segurança

Plano-gating é **gate comercial, não fronteira de segurança**. A segurança real continua
sendo: isolamento por org + permissões, impostas por **RLS** no banco. Uma igreja Free não
"vaza" dados de ninguém — ela só não vê a UI dos módulos Pro. Por isso é aceitável travar
em rota/menu (Fase 1) sem blindar cada Server Action. A blindagem por plano em actions/RLS
pode vir junto com a cobrança, quando o plano passa a ter consequência financeira.

## Transição / rollout

1. Aplicar m50 + grandfather (5 orgs → `pro`).
2. Mesclar o catálogo + travas. Como todas as orgs viram `pro`, **nada some** na prática;
   o mecanismo fica vivo e testável. Só orgs novas (Free) veriam cadeados.
3. `npm run verify` verde; commit em `main` (= deploy).

## Testes

- **Puro (catalog.test.ts):** `planAllows` (free bloqueia todos os gated; pro libera
  todos), `asPlanCode` (desconhecido→free), `requiredPlanFor`, integridade do catálogo
  (todo `FeatureKey` aparece em `pro`; nenhum recurso órfão).
- **gate.ts:** `gateFeature` devolve allow/deny conforme o plano.
- Verify padrão (typecheck+lint+test+build). Sem e2e novo obrigatório.

## Componentes / arquivos (resumo)

- **DB:** m50 `admin_set_org_plan` + grandfather.
- **`src/features/plans/`:** `catalog.ts`, `catalog.test.ts`, `gate.ts`,
  `components/Upsell.tsx`, `components/PlansComparison.tsx`.
- **`src/lib/auth/session.ts`:** `plan` no `OrgContext`.
- **`src/config/nav.ts`:** `feature?` nos itens travados.
- **`src/components/shared/Sidebar.tsx`:** cadeado nos itens fora do plano (recebe `plan`).
- **Páginas travadas** (finance, accounting, giving, spaces, dm, study, teams, events,
  members): `gateFeature` + `<Upsell>`.
- **Settings:** aba "Plano" com `PlansComparison`.
- **Admin:** seletor de plano + `setOrgPlanAction` + schema `parseOrgPlan`.

## Riscos / notas

- **Onde o Sidebar pega o `plan`:** o layout do dashboard já resolve `requireOrg`; passar
  `plan` ao Sidebar é aditivo (mesmo caminho da flag de admin). Confirmar no layout.
- **Rota direta a módulo travado:** coberto — a própria página faz `gateFeature` e mostra
  o Upsell, não só o menu.
- **Não quebrar deep-links existentes:** páginas travadas continuam existindo (retornam
  Upsell), não 404.
