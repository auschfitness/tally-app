# Handoff Supabase — feature Settings (/settings)

> Orquestrador → Claude Code. Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`,
> 2026-07-14. **Sem migração.** Última migração: **m20**.

## O ponto central: fonte da verdade por campo (tabela vs. blob)
Settings mistura dados relacionais e dados que ainda vivem no blob `app_state.data`. Decida
campo a campo e **documente no README**:

| Campo | Fonte | Observação |
|---|---|---|
| Nome da org | `organizations.name` | tabela |
| Moeda | `organizations.currency` | tabela |
| Campi (lista/nome) | `campuses` | tabela (id + name + org_id) |
| Instituição (perfil, marca, multi-instituição, etc.) | `app_state.data.institution` | blob |
| Config diversa (abas, filtros, categorias de finanças no blob, etc.) | `app_state.data.*` | blob |

Chaves de topo reais do blob hoje (confirmadas): inclui `institution`, `account`,
`activeCampus`, `settingsTab`, além das chaves de dados de features. **Só toque nas de config**
em Settings; as de dados de feature migram com suas features.

## RLS (confirmado)
- `organizations`: SELECT/UPDATE exigem **`is_org_member(id)`** (qualquer membro, NÃO só owner).
  Ou seja, hoje qualquer membro pode renomear a org / trocar moeda. Se quiserem restringir a
  **owner**, é uma migração de RLS minha — me peça.
- `campuses` e `app_state`: `is_org_member(org_id)` (leitura+escrita para membros).

## ⚠️ Escrita no blob = read-modify-write cirúrgico
`app_state.data` é um único jsonb com o estado inteiro da org. **Nunca** grave o objeto todo
por cima (o `save()` legado fazia isso e apagaria tudo que outra feature guarda ali). Padrão
já usado em Teams (`leadershipDev`) e Services: ler `data`, alterar SÓ a sub-chave do Settings
(ex.: `data.institution`), gravar de volta. Setar `updated_at`/`updated_by`.

## Colunas reais
- `organizations`: `id` · `name` NOT NULL · `currency` **text NOT NULL** · `created_at`.
- `campuses`: `id` · `org_id` NOT NULL · `name` NOT NULL · `created_at`.
- `app_state`: `org_id` (PK) · `data` **jsonb** · `updated_at` · `updated_by`.

## Moeda
`organizations.currency` é a fonte real. Se a UI de finanças (já migrada) lê moeda de outro
lugar, alinhe para `organizations.currency` ser a verdade — evite duas fontes divergentes.

## Depois de Settings
É a última tela. Em seguida: **cut-over** (`docs/handoffs/cutover-checklist.md`).

— fim. Restringir edição de org a owner = ação minha; é só pedir.
