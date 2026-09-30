---
id: "001"
title: "Banco da leitura: migrations m53/m54 + flag study.reader + tipos"
status: "todo"
area: "database"
agent: "@database-expert"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: ["002", "003"]
blocked_by: []
---

## Description

Implementar a camada de banco de dados para a feature "Tela de leitura da Bíblia" (reader screen).

**Migrations m53/m54:**
- m53: tabela `bible_readings` (user_id, passage_id, progress, created_at, updated_at) com RLS por org
- m54: coluna `reading_progress` (jsonb) em `bible_passages` para armazenar metadados de leitura (últimas posições, marcadores, datas de acesso)

**Flag study.reader:**
- Adicionar feature flag `study.reader` ao sistema de flags existente (usar `flags` table/RLS)
- Valor padrão: false (opt-in per org)

**Tipos:**
- Gerar `database.types.ts` atualizado via MCP Supabase
- Exportar tipos TypeScript para `src/features/study/types.ts` (BibleReading, ReadingProgress)

**Referência:** spec em `docs/specs/07-estudo-leitura.md`

## Acceptance Criteria

- [ ] Migrations m53 (bible_readings) e m54 (reading_progress) criadas e reversíveis
- [ ] RLS aplicado em ambas (isolamento por org via memberships)
- [ ] Flag study.reader registrada no sistema de flags com default false
- [ ] `database.types.ts` gerado via MCP com BibleReading, ReadingProgress
- [ ] Tipos exportados em `src/features/study/types.ts` prontos para uso pelo backend
- [ ] `npm run typecheck` verde
- [ ] Migrations testadas localmente (supabase start / reset)

## Technical Notes

- Usar nomenclatura do projeto (snake_case para colunas, não traduzir field names)
- RLS: `is_org_member(org_id)` deve ser true para ler/escrever
- reading_progress: JSON com { last_verse?: string; bookmarks?: string[]; last_accessed?: timestamp }
- Lembrar de setar `updated_at` trigger em ambas as tabelas
- Ver `docs/specs/07-estudo-leitura.md` para schema detalhado
- Migrations vão antes de qualquer código backend/frontend

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueia tasks 002 (backend) e 003 (dados João) |
