---
id: "005"
title: "Carga dos dados com service_role + revisão por amostra de João 1"
status: "todo"
area: "backend"
agent: "@study"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: ["006"]
blocked_by: ["003"]
---

## Description

Finalizar a carga de dados de João 1 no banco (via service_role) e executar revisão manual por amostra para validar integração end-to-end.

**O que fazer:**

1. **Carga via service_role** (script ou RPC):
   - Se não feito em task 003: criar seed script `src/features/study/seed.ts` que carrega João 1
   - Usar `createServiceRoleClient()` (não anon key)
   - Inserir em `bible_passages`, `bible_words` (palavras-chave com lemma), `bible_glosses` (glosas PT)
   - Validar: 36 versos × 2 versões (PT + grego) = 72 registros em bible_passages
   - Idempotente: rerun sem duplicação

2. **Revisão manual por amostra**:
   - Dono (@study role / product) abre a tela `/study/reader/joao-1-1` na staging/local
   - Verifica:
     - [x] Texto PT aparece corretamente (João 1:1–18 completo)
     - [x] Texto grego aparece paralelo (sem corrupção)
     - [x] Glosas aparecem ao hover (3–5 palavras testadas)
     - [x] Bookmark funciona (estado visual muda)
     - [x] Abas funcionam (clica Notas, volta pra Versículo)
     - [x] Responsividade (desktop 2 cols, mobile 1 col)
   - Registra achados em `docs/handoffs/estudo-leitura-qa.md` (novo arquivo)
   - Aprova ou reporta bugs para correção

3. **Integração com task 002/004**:
   - Confirmar que endpoints (task 002) retornam dados esperados
   - Confirmar que componentes (task 004) renderizam sem erro

**Referência:** plano em `docs/handoffs/estudo-leitura-plano.md`

## Acceptance Criteria

- [ ] Script de carga criado e testado localmente (`supabase start` + `npm run dev`)
- [ ] João 1:1–36 carregado em bible_passages (PT + grego)
- [ ] Palavras-chave e glosas inseridas em bible_words + bible_glosses
- [ ] Zero duplicatas após rerun do seed
- [ ] Arquivo `docs/handoffs/estudo-leitura-qa.md` criado com checklist de revisão manual
- [ ] Dono testou /study/reader/joao-1-1 e aprovou a experiência
- [ ] Bugs reportados corrigidos OU documentados como Backlog
- [ ] Tela funciona em navegador (dev server rodando, sem erros no console)

## Technical Notes

- Carga: usar `upsert` para garantir idempotência (INSERT ... ON CONFLICT DO NOTHING ou upsert RPC)
- Service role: nunca expor em client-side, apenas em servidor/RPC
- Validação: verificar record count em `bible_passages` e `bible_glosses` após carga
- QA: screenshot de /study/reader/joao-1-1 com glosa aberta, anexar a docs/handoffs/estudo-leitura-qa.md
- Bloqueia task 006 (E2E + docs final) até aprovação de QA

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueado por 003 (dados João), bloqueia 006 (E2E + docs final) |
