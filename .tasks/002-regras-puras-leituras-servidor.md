---
id: "002"
title: "Regras puras + leituras do servidor"
status: "todo"
area: "backend"
agent: "@study"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: ["004"]
blocked_by: ["001"]
---

## Description

Implementar as regras de negócio e os endpoints de leitura da Bíblia no servidor.

**Tasks 2–3 do plano:**

1. **Regras puras** (`src/features/study/domain.ts`):
   - `calculateReadingProgress(passage, userProgress): ReadingProgress`
   - `canUserRead(user, org): boolean` (gate por flag `study.reader` + permission `study.read`)
   - `formatPassageReference(book, chapter, verse): string` (PT-BR, ex: "João 1:1–18")

2. **Endpoints do servidor** (`src/app/api/study/readings/`):
   - `GET /api/study/readings/[passageId]` — retorna passage + progress do user + metadados
   - `POST /api/study/readings/[passageId]/progress` — atualiza progress (verse, bookmark, nota)
   - `GET /api/study/readings/bookmarks` — lista marcadores do user na org

**Restrições:**
- Usar `createServiceRoleClient()` para operações administrativas (carga de dados)
- Validar permissão `study.read` em cada endpoint
- RLS automático via Supabase (user_id + org_id)

**Referência:** spec em `docs/specs/07-estudo-leitura.md`

## Acceptance Criteria

- [ ] Arquivo `src/features/study/domain.ts` criado com 3 funções puras (calculateReadingProgress, canUserRead, formatPassageReference)
- [ ] Testes unitários em `src/features/study/__tests__/domain.spec.ts` (Vitest)
- [ ] 3 endpoints criados em `src/app/api/study/readings/`
- [ ] Validação de permissão + RLS em cada endpoint
- [ ] Testes de integração (Vitest com mock de Supabase) para endpoints
- [ ] `npm run verify` verde (typecheck, lint, test, build)
- [ ] Endpoints documentados em `docs/backend/study-api.md`

## Technical Notes

- Domain functions: sem dependência de DB, puras, testáveis
- Endpoints: usar o padrão de route handlers do Next.js 15 (`route.ts`)
- Progress update: atualizar tanto `bible_readings` quanto `reading_progress` em `bible_passages`
- Bookmark: validar que passage_id é válido antes de salvar
- Ver `docs/specs/07-estudo-leitura.md` para estrutura de resposta esperada
- Bloqueia task 004 (frontend) — aguarda confirmar os endpoints

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueado por 001 (banco), bloqueia 004 (tela) |
