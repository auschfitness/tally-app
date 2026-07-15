# Handoff Supabase — feature Care (/care)

> Orquestrador → Claude Code. Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`,
> 2026-07-14. **Sem migração.** Última migração: **m20**.
> Depende do **Signals engine** (já concluído, `features/signals/domain.ts`).

## ⚠️⚠️ ALERTA PRINCIPAL — Care tem RLS POR PERMISSÃO (diferente de todo o resto)
`care_items` NÃO usa `is_org_member`. Usa `has_perm`:
- **SELECT / INSERT / UPDATE** → exigem `has_perm(org, 'care.view')`.
- **DELETE** → exige `has_perm(org, 'care.manage')`.
`care_notes` e `care_contacts` são gated **pelo pai** (EXISTS em `care_items`) — então herdam
o mesmo controle.

Como `has_perm` funciona (confirmei a função): retorna true se o usuário é **owner**
(`memberships.is_owner`) OU tem a permissão no próprio membership OU no papel (`roles`).
➡️ **Fixture de teste**: o usuário semeado é **owner** (criado via `create_org`), então
`care.view`/`care.manage` passam automaticamente — **os testes de Care funcionam sem eu mexer
na fixture**. Confirmado.
➡️ **Produto**: um membro de staff SEM `care.view` **não enxerga nada de Care** — isso é o
comportamento correto e intencional (Care é sensível). A UI deve tratar "sem permissão" com
elegância (não erro feio). Se precisar de um usuário de teste NÃO-owner com/sem a permissão
para validar os dois caminhos, **me peça** que eu semeio o membership certo.

## ⚠️ IDs de PESSOA aqui são de auth.users, NÃO de sticks
Fácil de errar: `care_items.assigned_to`, `care_items.created_by`, `care_notes.author_id`,
`care_contacts.contacted_by` → todos FK para **`auth.users(id)`** (usuário do sistema), não
para `sticks`. Já `care_items.stick_id` e `care_contacts.stick_id` são a **pessoa cuidada**
(sticks). Resolva nomes de "responsável/autor" via profiles/usuário, e "pessoa" via sticks.

## Enums (valores EXATOS)
- `priority` (care_items) = `signal_priority`: **celebration, notice, attention, urgent**
- `status` (care_items) = `care_status`: **new, assigned, in_progress, waiting, resolved, closed**

## Colunas reais
**care_items**: `id` · `org_id` NOT NULL · `stick_id` uuid null (CASCADE) ·
`signal_id` uuid null (SET NULL — liga ao Signal de origem) · `category` text null ·
`title` NOT NULL · `description` null · `assigned_to` uuid null (auth.users) ·
`priority` enum NOT NULL · `status` enum NOT NULL · `due_date` date null ·
`confidentiality_level` **text NOT NULL** · `next_action` text null · `created_by` (auth.users) ·
`created_at` · `resolved_at` null.

**care_notes**: `id` · `care_item_id` NOT NULL (CASCADE) · `author_id` (auth.users, SET NULL) ·
`visibility` **text NOT NULL** · `content` text NOT NULL · `created_at`.

**care_contacts**: `id` · `care_item_id` NOT NULL (CASCADE) · `stick_id` null (SET NULL) ·
`contacted_by` (auth.users, SET NULL) · `contacted_on` **date NOT NULL** · `method` text null ·
`note` text null · `created_at`.

## ⚠️ `confidentiality_level` / `visibility` são rótulos de app, não RLS
O acesso real é só `care.view`/`care.manage`. Uma nota marcada "private" fica visível a
**todos** que têm `care.view` — a RLS não separa por nota. Trate como rótulo de exibição.
Se quiser confidencialidade real por item/nota (ex.: só o autor + líderes), é uma migração de
RLS que **eu** faço — me peça quando decidirem o modelo.

## Cascades
- Apagar `care_item` → CASCADE em `care_notes` e `care_contacts`.
- Apagar a **stick** → CASCADE em `care_items` (some o item de cuidado da pessoa).
- Apagar o **signal** de origem → `care_items.signal_id` vira NULL (item sobrevive).

## Ligação com Signals
Um Care nasce muitas vezes de um Signal (`signal_id`). O Signal vem do **engine**
(`features/signals/domain.ts`, já pronto), não da tabela `signals` necessariamente — ver o
handoff de Inbox para a distinção engine-vs-tabela antes de assumir a fonte.

— fim. Confidencialidade real / usuário de teste não-owner = ações minhas; é só pedir.
