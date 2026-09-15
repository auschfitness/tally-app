# Feature: Flags (gate de maturidade)

"Está pronto?" — quem decide é o time. Ortogonal ao plano (`features/plans`, "pagou?" —
quem decide é o cliente). **Nenhum dos dois é fronteira de segurança: o RLS é.**

Ordem do gate, sempre: `flagOn()` primeiro, `planAllows()` depois.

## Arquivos-chave
- `catalog.ts` — `FlagKey` (as 8 chaves), `ALL_FLAGS`, `Rollout`, `isFlagKey`,
  `parseRollout`, `globalOn`. Fonte da verdade das chaves em código.
- `gate.ts` — `flagOn(ctx, key)`, **síncrono**: as flags ligadas da org já vêm
  resolvidas no `OrgContext` (uma RPC `org_flags` por request, em `lib/auth/session.ts`).
- `gatedLayout.tsx` — `makeGatedLayout("<flag>")` para o `layout.tsx` da rota do módulo.
  Flag off → **404** (a feature em obra não existe), não Upsell.
- `components/Flagged.tsx` — `<Flagged flag="x">` esconde um trecho dentro de tela
  existente. Passe `ctx` se a página já tiver o contexto.
- Painel: `/admin/flags` (`features/admin/components/FlagsPanel.tsx`).

## Como nascer atrás de flag
1. A chave já está no catálogo e no banco (migration m51). Toda flag nasce `off`.
2. Na rota do módulo: `src/app/(dashboard)/<x>/layout.tsx` →
   `export default makeGatedLayout("<flag>")`.
3. Para validar: `/admin/flags` → escolha a igreja → **Ligar** (override por org).
4. Aprovado pelo dono → alcance global "Todas as igrejas".

## Banco (m51, já aplicada)
`feature_flags` (catálogo global: `enabled`, `rollout` ∈ off/orgs/all) e
`feature_flag_orgs` (override por igreja — vence o global). Funções: `org_flags(org)`,
`flag_on(key, org)`, `admin_set_flag`, `admin_set_flag_org` (as duas últimas exigem
`is_platform_admin()` por dentro). Não há RPC para **remover** override: para a igreja
voltar a herdar o global, apague a linha de `feature_flag_orgs` no banco.
