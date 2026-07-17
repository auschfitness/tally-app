# Feature: Equipe e cargos (aba de /settings)

Gerência de **cargos** (roles) e de **quem tem qual cargo** (memberships). Vive como uma
aba em Configurações. Handoff: `docs/handoffs/assentos-papeis.md` (banco m26–m27, sem
mudança de schema).

## O que faz
1. **Cargos** — lista os cargos da org (nome + resumo das permissões + nº de pessoas).
   Criar cargo personalizado (nome + checkboxes do catálogo), editar/renomear qualquer
   cargo, excluir **só** os personalizados.
2. **Pessoas com acesso** — lista `memberships` + `profiles` e atribui um cargo a cada
   pessoa via `memberships.role_id` (a coluna legada `role` não é tocada).

## Gating — `members.manage`
Dono/Pastor/Tesoureiro editam; os demais veem em somente-leitura (RLS libera o SELECT).
A page decide `canManage = can(ctx, "members.manage")` no servidor; cada action revalida.

⚠️ **Permissões efetivas = união** das do membership com as do **cargo** (`role_id`).
`requireOrg` agora embute `roles(name, permissions)` e faz essa união — espelha o
`has_perm` do banco (m26). Sem isso, quem é Pastor **pelo cargo** teria o RLS liberado
mas a UI escondida. `ctx.roleId`/`ctx.roleName` também ficam disponíveis.

## Fonte da verdade / RLS
- `roles`: SELECT = qualquer membro; INSERT/UPDATE = `members.manage`; DELETE =
  `members.manage` **e** `is_system=false`. O botão Excluir some em cargo de sistema
  (não adianta oferecer o que o RLS recusa) e a action recusa cargo **em uso** (FK).
- `memberships`: UPDATE de `role_id` = `members.manage`. `assignRoleAction` confere que
  o cargo é da mesma org antes de gravar (o RLS não amarra isso).
- **Sem FK** `memberships.user_id → profiles`: a junção nome/e-mail é feita no app
  (`loadMembers`), não embutida pelo PostgREST.
- O **Dono** não recebe seletor de cargo: quem manda nele é `is_owner` (ignora o RLS);
  dar-lhe um cargo não mudaria nada.

## Timeline (DNA #4)
Atribuir cargo gera `timeline_events` **best-effort**: `timeline_events.stick_id` é
NOT NULL e não há vínculo usuário↔Stick, então casamos por e-mail
(`profiles.email → sticks.email`). Sem Stick correspondente, a atribuição vale e só não
gera evento — a Timeline nunca derruba a ação principal.

## Arquivos
- `domain.ts` (+ `domain.test.ts`) — catálogo de permissões, `describeRole`,
  `sanitizePermissions`, `validateRoleName` (puro, testável).
- `queries.ts` — `loadRoles` (com contagem de membros), `loadMembers` (join no app).
- `schema.ts` / `actions.ts` — create/update/delete de cargo + assign de cargo.
- `components/` — `TeamPanel` (abas → Pessoas + Cargos), `MemberList`, `RoleList`,
  `RoleEditor`.
