# Assentos / Papéis (cargos) — handoff para o Claude Code

> Frente "TIPOS de assentos" levantada pelo dono. **Lado do banco APLICADO pelo orquestrador**
> (migrações m26–m27, 2026-07-17). Falta o **front**. Sem mudança de schema pendente; os tipos
> em `src/lib/database.types.ts` NÃO mudaram (m26/m27 não alteraram colunas) — nada a regerar.

## O que já está no banco (pronto para o front usar)
Toda org agora tem **6 cargos de sistema (PT-BR)** na tabela `roles`. `create_org` semeia esses
cargos em cada igreja nova e marca o dono com o cargo **Dono**; as orgs existentes já foram
backfilladas (Convergence, Tally Test, Grace Church).

| Cargo | Permissões |
|---|---|
| **Dono** | (nenhuma na lista — o dono ignora o RLS via `memberships.is_owner`; pode tudo) |
| **Pastor** | `sticks.edit`, `care.view`, `care.manage`, `prayer.view_private`, `prayer.manage`, `groups.manage_all`, `org.manage`, `members.manage` |
| **Tesoureiro** | `finance.manage`, `members.manage` |
| **Equipe de Cuidado** | `sticks.edit`, `care.view` |
| **Líder de Grupo** | `groups.manage_assigned` |
| **Membro** | (nenhuma — acesso básico) |

Decisões do dono já refletidas: cargos em **PT-BR**; **members.manage** dado a **Dono + Pastor +
Tesoureiro** (quem pode gerenciar cargos e membros).

## Catálogo de permissões (capabilities) — use como checkboxes na UI
Rótulos PT-BR sugeridos (a chave à esquerda é o valor real gravado em `roles.permissions`):

- `members.manage` → **Gerenciar equipe e cargos** (convidar/remover pessoas, atribuir cargos)
- `org.manage` → **Administrar a igreja** (configurações e dados institucionais/fiscais)
- `finance.manage` → **Gerenciar financeiro** (lançamentos, categorias, dados fiscais)
- `sticks.edit` → **Editar pessoas** (Sticks)
- `care.view` → **Ver Care**
- `care.manage` → **Gerenciar Care**
- `prayer.view_private` → **Ver orações privadas**
- `prayer.manage` → **Gerenciar orações**
- `groups.manage_all` → **Gerenciar todos os grupos**
- `groups.manage_assigned` → **Gerenciar os grupos de que é líder**

Onde cada permissão é imposta hoje: `members.manage` → escrita em `memberships` e `roles` (RLS);
`care.*`/`prayer.*` → RLS nas tabelas de Care/oração; `finance.manage`/`org.manage` → dados
fiscais (`can_manage_org_fiscal`, Onda 1) + checagens de app; `sticks.edit`/`groups.*` → checagens
no app (server actions). Ao criar cargo novo, qualquer combinação dessas chaves é válida.

## RLS (já aplicado — o front só precisa respeitar)
- **`roles`**: SELECT = qualquer membro; INSERT/UPDATE = quem tem `members.manage`; DELETE = quem
  tem `members.manage` **e** o cargo **não** é de sistema (`is_system=false`). Ou seja, os 6 cargos
  padrão não podem ser excluídos — só renomeados/reeditados. Cargos personalizados podem ser criados
  e excluídos.
- **`memberships`**: SELECT = você mesmo ou membro da org; INSERT = self no onboarding (org sem
  membros) ou quem tem `members.manage`; UPDATE/DELETE = quem tem `members.manage`. Para **atribuir
  um cargo a alguém**, faça UPDATE de `memberships.role_id`.

## Escopo de FRONT (Claude Code)
Nova área em **Configurações** (sugestão de rótulo: **"Equipe e cargos"**). Visível/editável só
para quem tem `members.manage` (Dono/Pastor/Tesoureiro); para os demais, ocultar ou deixar
somente-leitura. Duas partes:

1. **Cargos**: listar os cargos da org (nome + permissões marcadas). Criar cargo personalizado
   (nome + checkboxes do catálogo acima). Editar permissões de qualquer cargo; renomear. Excluir
   só cargos personalizados (o RLS bloqueia excluir os de sistema — reflita isso desabilitando o
   botão quando `is_system`).
2. **Membros**: listar as pessoas da org (`memberships` + `profiles` p/ nome/idioma). Atribuir um
   **cargo** a cada pessoa (`role_id`). Convidar/remover — respeitando o RLS. (Convite por e-mail
   pode ficar numa fatia 2 se for grande; comece por atribuir cargo a quem já é membro.)

Dados/tipos: use `role_id` (uuid) — **não** a coluna legada `memberships.role` (texto, ex.: 'owner').
O dono aparece com cargo **Dono**. Toda ação relevante deve gerar `timeline_events` quando fizer
sentido (DNA #4), ex.: "Fulano recebeu o cargo Tesoureiro".

## Verificação
`npm run verify` verde + (se possível) e2e. Teste o caminho: um membro **sem** `members.manage`
não vê/edita a área; com o cargo Pastor/Tesoureiro, vê e consegue atribuir cargos. Commit em `main`.

— Banco: m26 (RLS de roles + `seed_default_system_roles` + `create_org`), m27 (backfill). Dúvidas
de schema/permissão: pare e sinalize o orquestrador.
