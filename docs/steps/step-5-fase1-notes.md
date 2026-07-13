# Step #5 · Fase 1 (Study: Sermon + Library + editor básico) — nota de handoff do orquestrador

Divisão: **banco = orquestrador**, **front = Claude Code**. Esta fase PRECISA de schema novo.
Protocolo: proponha o SQL em `.tmp/step-5-fase1/migration.sql` e PARE; o orquestrador aplica com RLS/advisors e escreve `SCHEMA-READY.md`.

## Escopo da Fase 1 (doc §25)
Navegação Study; entidade **Sermon**; **Sermon Library** (visual, com filtros); **editor básico**. Séries é Fase 2; reconhecimento de escritura é Fase 3; notes/resources Fase 4. NÃO construir isso agora.

## Alvo do schema (proponha em cima disto)
- **sermons**: id, org_id, title, subtitle, description, preacher_id (uuid, nullable — pode ser um Stick/leader depois), series_id (uuid **nullable, SEM FK ainda** — a tabela series vem na Fase 2), sermon_date (date), campus_id (nullable fk campuses), service_id (uuid nullable, SEM FK — services é Step 6), status (enum), visibility (enum), created_at, updated_at.
- **Corpo do sermão como jsonb** (é um documento, não entidade relacional — aqui jsonb é o certo, ao contrário de tracks/journey): sugiro colunas `main_passage text`, `big_idea text`, e um `content jsonb default '{}'` guardando as seções estruturadas (outline, notes, illustrations, application, prayer_response, references, media). Assim o editor evolui sem migração a cada campo.
- Enums novos: `sermon_status` (draft, preparing, ready, preached, archived); `sermon_visibility` (private, leadership, church, public).
- RLS: `is_org_member(org_id) to authenticated`. **Nota sobre visibility:** na Fase 1, RLS por org-member basta (todos da org veem os sermões). Visibilidade fina (private só do autor, leadership-only) é refinamento de fase futura — não bloquear agora, só deixar a coluna pronta.

## O que fica pra depois (não criar agora)
- `series` (tabela) + FK series_id → Fase 2.
- `sermon_scriptures` (relação sermão↔passagem, pro Scripture Map) → Fase 3 (aí sim relacional/linhas).
- Sem seed em create_org (sermões são conteúdo da igreja).

## Regras (DNA)
- Study conecta a Sticks (Timeline: participação em ensino), Services e Journey nas fases futuras — não é módulo isolado, mas na Fase 1 pode ficar standalone e ir ligando.
- IA é suporte, nunca autora — na Fase 1 não há IA, só o editor. Não gerar sermão automaticamente.
- Dados reais; Library lê sermões reais; estado vazio honesto ("Nenhum sermão ainda").
- RLS: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID.

## Front (só depois de SCHEMA-READY)
- `sermons-repo.js`: hydrate + `createSermon`/`updateSermon` (salva metadata + content jsonb).
- Tela **Study** (nav novo): Sermon Library (cards + filtros por status/campus/data) + editor básico (título, passagem, big idea, outline/notes em campos estruturados no content).
- Tela nova → entra em FEATURE_VIEWS (smoke), não na paridade.
