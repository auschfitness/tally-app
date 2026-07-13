# Step #4 · Fase 5 (Discipleship Tracks) — nota de handoff do orquestrador

Divisão: **banco = orquestrador** (Cowork), **front + camada de dados + /verify-app + validação MCP = Claude Code**.
Esta fase PRECISA de schema novo. Protocolo: no `/implement-step`, proponha o SCHEMA em `.tmp/step-4-fase5/migration.sql` e PARE; o orquestrador aplica com RLS/advisors e escreve `.tmp/step-4-fase5/SCHEMA-READY.md`.

## O que a spec pede (doc §17-18)
- **Track**: id, name, description, stages, materials, completion_requirements.
- **Track Enrollment**: stick_id, track_id, current_step, progress, started_at, completed_at.
- Conclusão de uma trilha CRIA: Milestone + movimento de Journey (se configurado) + timeline_event.

## Alvo do schema (o orquestrador aplica; proponha em cima disto)
- **tracks**: id, org_id, name, description, type text, status text default 'active', created_at.
- **track_steps**: id, org_id, track_id (fk tracks on delete cascade), name, description, position int, materials jsonb default '[]', created_at. (Estágios como LINHAS, não jsonb — segue o padrão relacional do produto.)
- **track_enrollments**: id, org_id, track_id, stick_id (fk sticks), current_step_id (fk track_steps), progress int default 0, status text default 'in_progress', started_at, completed_at, created_at, updated_at. UNIQUE (track_id, stick_id).
- RLS `is_org_member(org_id) to authenticated` nas três (mesmo padrão das demais).
- `materials` fica como jsonb simples por ora; biblioteca de recursos completa é da Step #5 (Study), não construir aqui.

## Regras (DNA)
- Conclusão de trilha → cria milestone + timeline_event; movimento de Journey só se a trilha estiver configurada pra isso (não force).
- Milestone espiritualmente significativo continua exigindo confirmação humana, nunca automático.
- Dados reais; progresso derivado de steps concluídos, sem número inventado.
- Conecta a Sticks (Timeline), Journey e Milestones — não é módulo isolado.
- RLS: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID.

## Front (só depois de SCHEMA-READY)
- `tracks-repo.js`: hydrate de tracks + steps; `enroll(stickId, trackId)`; `advanceStep`/`completeStep` (atualiza current_step_id/progress, e na conclusão cria milestone + timeline + eventual movimento de Journey).
- Tela de Study/Tracks pode ser mínima nesta fase (lista de trilhas + progresso da pessoa, como o exemplo "Ruth Alves · Faith Foundations · 3 de 5"). Graduação de teste: se criar/alterar tela, tira da paridade e adiciona smoke (política já registrada).
