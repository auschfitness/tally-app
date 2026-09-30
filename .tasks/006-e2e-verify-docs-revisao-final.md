---
id: "006"
title: "E2E + verify + docs + revisão final"
status: "todo"
area: "qa"
agent: "@qa-engineer"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: []
blocked_by: ["004", "005"]
---

## Description

Finalizar a feature com testes E2E, verificação de build/lint/type, documentação atualizada e revisão de qualidade final.

**Task 11 do plano:**

1. **Testes E2E** (Playwright, em `e2e/study-reader.spec.ts`):
   - Cenário 1: Abrir `/study/reader/joao-1-1`, verificar texto PT + grego carregados
   - Cenário 2: Clicar palavra-chave (hover), validar glosa aparece
   - Cenário 3: Mobile: trocar coluna (toggle), validar exibição 1 col
   - Cenário 4: Clicar bookmark, validar ícone muda (filled/unfilled)
   - Cenário 5: Clicar aba Notas, volta para Versículo sem erro
   - Cobertura: Page Object Model, `data-testid` em elementos-chave
   - `npm run test:e2e` — todos os cenários passam

2. **Verificação de qualidade** (`npm run verify`):
   - [x] typecheck verde (TypeScript estrito, sem `any`/`!`)
   - [x] lint verde (ESLint, sem console.log)
   - [x] test verde (Vitest: unit tests em domain.ts + tests de endpoints)
   - [x] build verde (Next.js build, tamanho razoável)

3. **Documentação atualizada**:
   - `docs/specs/07-estudo-leitura.md` — revisar, completar se faltou detalhe
   - `docs/features/study-reader.md` — guia de uso (para o pastor/admin)
   - `docs/backend/study-api.md` — endpoints documentados (GET /readings/[id], POST /progress, GET /bookmarks)
   - `docs/frontend/study-reader-component.md` — estrutura de componentes, como reutilizar
   - `docs/handoffs/estudo-leitura-fase1-completa.md` — resumo de entrega (o que foi feito, o que fica para Fase 2)

4. **Revisão final** (@revisor):
   - Verifica que spec foi cumprida (todas as abas, glosas, marcadores, responsividade)
   - Valida DNA do Tally: dados reais (não ilustrativos), uma ação primária por tela, design system respeitado
   - Confirma que `npm run verify` está verde
   - Aprova para merge ou lista bloqueadores

**Referência:** spec em `docs/specs/07-estudo-leitura.md`, plano em `docs/handoffs/estudo-leitura-plano.md`

## Acceptance Criteria

- [ ] Arquivo `e2e/study-reader.spec.ts` criado com 5 cenários (E2E)
- [ ] Todos os cenários passam em `npm run test:e2e`
- [ ] `npm run verify` verde (typecheck, lint, test, build)
- [ ] Documentação atualizada em 5 arquivos (specs, features, backend API, frontend comp, handoff)
- [ ] Revisor (@revisor) validou spec + DNA + verify e aprovou
- [ ] README ou START_HERE.md aponta para `/study/reader/[passageId]` como novo entry point
- [ ] Feature flag `study.reader` pode ser toggled no admin (ou está com default false, pronto para ser ligado)
- [ ] PR aprovada e mergeada para main

## Technical Notes

- E2E: usar URL do dev server (port 3000), login de fixture (test-support/fixtures)
- Testes: reuse de selectors em page-object.ts (Reader page object)
- Docs: manter tom do Tally (prático, sem linguagem artificial), exemplos com João 1
- Verificação: rodar `npm run verify` uma última vez no terminal antes de marcar concluído
- Revisor: checar contra design-principles.md + CLAUDE.md regras críticas
- Bloqueia release (Fase 1 está completa quando task 006 é ✓)

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueado por 004 (tela) + 005 (dados + QA), não bloqueia nada |
