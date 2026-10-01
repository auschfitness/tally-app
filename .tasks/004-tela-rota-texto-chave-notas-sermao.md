---
id: "004"
title: "Tela: rota, texto, chave/balão, área de trabalho, abas Versículo/Notas/Sermão"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "high"
created_at: "2026-09-30"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-008"]
blocks: ["006"]
blocked_by: ["002"]
---

## Description

Implementar a interface de leitura da Bíblia (Bible Reader screen) — a página /study/reader/[passageId].

**Tasks 4–8 do plano:**

1. **Rota** (`src/app/(dashboard)/study/reader/[passageId]/page.tsx`):
   - Rota dinâmica que carrega passage_id da URL
   - SSR com `getPassage()` (chamada ao endpoint de task 002)
   - Fallback 404 se passage não existe

2. **Exibição de texto** (componente Reader):
   - Texto principal (PT-BR, versão configurável — ACF/ARA seletor)
   - Texto grego paralelo (UBS5/WH) em coluna ou dropdown
   - Numeração de versos em azul (#2B5CE6)
   - Responsividade: desktop (2 colunas) / mobile (1 coluna, toggle)

3. **Chave de leitura + balão de glosa**:
   - Hover em palavra-chave → balão com glosa em PT
   - Design: pop-up suave, azul claro, sem sombra pesada (ver design-tokens)
   - Mobile: tap abre glosa, tap fora fecha

4. **Área de trabalho** (nota pessoal + marcador):
   - Caixa de texto de nota não persistida localmente (será persistida em task 005)
   - Botão "Marcar" (bookmark) — visual: ícone de bookmark preenchido/vazio
   - Indicador de progresso (último verso lido — realçado em cor de fundo)

5. **Abas: Versículo | Notas | Sermão**:
   - Aba Versículo: texto + chaves + notas (padrão, a que se abre)
   - Aba Notas: histórico de notas pessoais do user (placeholder enquanto sem backend)
   - Aba Sermão: seletor de sermão + seções do sermão (esboço/notas/ilustrações/aplicação) — ligação com task 008 do roadmap

**Design:** Ver design-principles.md — uma ação primária por tela (leitura), revelação progressiva (glosas on-hover, abas), ar no lugar de caixas.

**Referência:** spec em `docs/specs/07-estudo-leitura.md`, plano em `docs/handoffs/estudo-leitura-plano.md`

## Acceptance Criteria

- [ ] Rota `/study/reader/[passageId]` criada e SSR funcional
- [ ] Texto PT + texto grego carregados dos endpoints (task 002)
- [ ] Componente Reader com 2 colunas (desktop) / 1 coluna (mobile, com toggle)
- [ ] Chaves com glosa em hover (popup, sem glitch)
- [ ] Área de trabalho com nota + bookmark (estado local, não persistido ainda)
- [ ] Indicador de progresso (verso lido realçado)
- [ ] 3 abas (Versículo/Notas/Sermão) funcionais — Versículo com dados, Notas/Sermão com placeholder
- [ ] Design respeitando design-principles.md (azul #2B5CE6, Poppins, cores no design-tokens)
- [ ] Teste E2E em Playwright: abrir /study/reader/joao-1-1, clicar glosa, trocar coluna
- [ ] `npm run verify` verde

## Technical Notes

- SSR: usar `getPassage()` do endpoint (task 002) ou RPC com service_role
- Glosa: componente Popover/Tooltip reutilizável (pode ir para shared components)
- Responsividade: breakpoints em design-tokens, não inline
- Abas: usar componente Tabs existente (ou criar se não existe em components/)
- Sermon link: placeholder por enquanto (será task 008 ao finalizar sermon linking)
- Bloqueia task 006 (E2E + verify + docs)

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-09-30 | human | Task criada — bloqueado por 002 (backend), bloqueia 006 (E2E + docs) |
