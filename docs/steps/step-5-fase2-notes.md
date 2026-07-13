# Step #5 · Fase 2 (Series) — nota de handoff do orquestrador

Divisão: **banco = orquestrador**, **front = Claude Code**. Precisa de schema novo (pequeno).
Protocolo: proponha o SQL em `.tmp/step-5-fase2/migration.sql` e PARE; o orquestrador aplica com RLS/advisors e escreve `SCHEMA-READY.md`.

## Escopo (doc §16-17)
Series como entidade de primeira classe + conectar sermões a uma série + workspace de planejamento de série.

## Alvo do schema
- **series**: id, org_id, title, description, theme, cover_image (text/url), start_date (date), end_date (date), status (text default 'active' — ou enum se preferir: planning/active/completed/archived), created_at.
- **FK adiada agora vira real**: adicionar constraint `sermons.series_id → series(id) on delete set null` (a coluna já existe nullable desde a Fase 1).
- RLS `is_org_member(org_id) to authenticated` em `series`.
- Sem seed (séries são conteúdo da igreja).

## Front (só depois de SCHEMA-READY)
- `series-repo.js` (ou estender sermons-repo): hydrate + createSeries/updateSeries; vincular sermão a série (setar sermons.series_id).
- Na tela Estudo: agrupar a Library por série; workspace de série (visão, tema, escrituras-chave, cronograma de sermões — rascunhos e concluídos). Estado vazio honesto.
- Filtro por série na Library.
- Tela/mudança nova → smoke, não paridade.

## Regras (DNA)
- Dados reais; série vazia mostra "sem sermões ainda", não inventa cronograma.
- Conecta a sermons (não é módulo isolado). RLS: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID.

## Depois
- /verify-app verde + validação MCP (series sob RLS + rollback, single-table). Commit `feat(step5-fase2): Series`.
