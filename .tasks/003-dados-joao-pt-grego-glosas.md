---
id: "003"
title: "Dados de João: ligação PT↔grego + glosas PT"
status: "todo"
area: "backend"
agent: "@study"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: ["005"]
blocked_by: ["001"]
---

## Description

Implementar a carga de dados de João 1 no banco — ligação entre português (ACF/ARA) e grego (UBS/WH) + glosas em português.

**Task 9–10 do plano:**

1. **Ligação PT ↔ grego** (`src/features/study/data/joao-1-mapping.ts`):
   - Mapear cada verso de João 1 (ACF/ARA) para sua contraparte em grego (UBS5/WH)
   - Formato: `{ pt_ref: "João 1:1", pt_text: "...", greek_ref: "John 1:1", greek_text: "...", words: [{ pt, greek, lemma }] }`

2. **Glosas em PT** (`src/features/study/data/joao-1-glosses.ts`):
   - Notas breves em PT-BR para palavras-chave e expressões idiomáticas de João 1
   - Exemplo: { word: "lógos", gloss: "palavra; a revelação de Deus em Cristo" }

3. **Carga no banco** (RPC ou seed):
   - Usar `createServiceRoleClient()` para inserir dados em `bible_passages`, `bible_words`, `bible_glosses`
   - Seed script: `supabase/seed.sql` ou `src/features/study/seed.ts`
   - Idempotente: rerun não duplica dados

**Restrições:**
- Dados de João 1 (36 versos) para validação — não todo o NT na Fase 1
- Glosas: 50–100 palavras-chave, sem excesso de detalhe
- Nomenclatura: field names em en (word, gloss), dados em PT

**Referência:** spec em `docs/specs/07-estudo-leitura.md`, plano em `docs/handoffs/estudo-leitura-plano.md`

## Acceptance Criteria

- [ ] Arquivo `src/features/study/data/joao-1-mapping.ts` com mapa PT ↔ grego (36 versos)
- [ ] Arquivo `src/features/study/data/joao-1-glosses.ts` com glosas de palavras-chave
- [ ] Seed criado (RPC em migrations m55 OU script em `src/features/study/seed.ts`)
- [ ] Dados carregados no banco via `supabase db push` (ou manualmente via RPC no dev)
- [ ] Verificação manual: João 1:1–18 aparece corretamente na UI (teste em task 004)
- [ ] Testes unitários para parsing do mapa (validar estrutura, sem typos em refs)
- [ ] `npm run verify` verde

## Technical Notes

- Formato de dados: JSON ou TS objects? Preferência = TS + export, importa-se no seed
- Glosas: ser conciso (1–2 linhas), evitar jargão teológico excessivo, usar exemplos breves
- Seed: executar manualmente OU via migration m55 com `CREATE OR REPLACE FUNCTION load_joao_1_data()` que a task 005 invoca
- Ver `docs/specs/07-estudo-leitura.md` para estrutura esperada em bible_passages / bible_words
- Task 005 aguardará esta estar pronta antes de fazer load completo

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueado por 001 (banco), bloqueia 005 (carga + revisão) |
