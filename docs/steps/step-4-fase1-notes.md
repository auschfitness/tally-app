# Step #4 · Fase 1 (Journey) — nota de handoff do orquestrador

Este arquivo é um bilhete do orquestrador (Cowork, dono do schema) para o Claude Code (dono do front).
Divisão de trabalho: **banco = orquestrador**, **front + camada de dados + /verify-app + validação MCP = Claude Code**.

## Estado atual do banco (Journey) — confirmado
- `journey_stages` JÁ EXISTE: id, org_id, name, position, created_at. Tem 6 linhas na org demo (estágios padrão).
- `sticks.journey_stage_id` JÁ EXISTE (a Stick aponta pra um estágio).
- `milestones` e `milestone_types` JÁ EXISTEM.
- NÃO existe ainda: tabela-pai `journeys`, nem `stick_journey_records`.

Ou seja: a Fase 1 CRIA o que falta e ENRIQUECE o que já tem. Não recrie `journey_stages`.

## Alvo do schema da Fase 1 (o orquestrador aplica)
1. `journeys` (id, org_id, name, description, is_default, created_at).
2. Enriquecer `journey_stages`: + journey_id (fk journeys), description, color, required_milestones (uuid[]), recommended_actions (jsonb).
3. `stick_journey_records` (id, org_id, stick_id, journey_id, current_stage_id, previous_stage_id, entered_stage_at, completed_stages uuid[], notes, timestamps; unique stick+journey).
4. RLS is_org_member em todas + seeding de journey padrão no `create_org` (fecha o follow-up).

## Protocolo (handoff por arquivo, sem o Gaybiel no meio)
1. Ao rodar `/implement-step 4 fase1`, no PLANO proponha o SCHEMA acima e grave o SQL em `.tmp/step-4-fase1/migration.sql`. NÃO aplique você mesmo.
2. O orquestrador lê esse arquivo direto da pasta, aplica no Supabase (com RLS, seeding e advisors), e escreve `.tmp/step-4-fase1/SCHEMA-READY.md` com os nomes finais de tabelas/colunas.
3. Só finalize a camada de dados do front DEPOIS que `SCHEMA-READY.md` aparecer.

## Foco do FRONT nesta fase (Fase 1, não a visualização ainda)
- Conectar Sticks à Journey: ler/gravar `stick_journey_records` (padrão dos repos em core/, ex. sticks-repo.js).
- Estágios customizáveis (CRUD de journey_stages ligado a uma journey).
- Preparar o terreno pro Journey Map (isso é a Fase 2 do doc — não construir o mapa ainda).
- Regras do DNA: nada de score espiritual; estágios são movimento operacional, não ranking; toda mudança de estágio gera timeline_event; dados reais, sem número inventado.
