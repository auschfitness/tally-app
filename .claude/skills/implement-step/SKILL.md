---
name: implement-step
description: Constrói UMA fase de uma step do roadmap Tally (Notion #4–#12) de ponta a ponta. Argumentos: número da step e a fase (ex: /implement-step 4 fase1). Invocar como slash command.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Construir uma fase de uma step do roadmap Tally

**Argumentos:** o comando é `/implement-step <STEP> <FASE>` (ex.: `/implement-step 4 fase3` → STEP=4, FASE=fase3).
A substituição automática de `$1`/`$2` NÃO é confiável aqui — **identifique STEP e FASE a partir do
comando do usuário** e use SEMPRE estes caminhos derivados:
- Spec da step: `docs/steps/step-<STEP>.md`
- Artefatos desta fase: `.tmp/step-<STEP>-<FASE>/` (plan.md, migration.sql, report.md)
- Mensagem de commit: `feat(step<STEP>-<FASE>): <descrição>`
(Ex.: STEP=4, FASE=fase3 → `docs/steps/step-4.md`, `.tmp/step-4-fase3/`, `feat(step4-fase3): ...`.)

Contexto pré-carregado (args crus p/ diagnóstico + specs disponíveis; leia o spec certo com o Read):
!```
echo "== Argumentos crus (podem vir errados; use o comando do usuário) =="
echo "ARGUMENTS='$ARGUMENTS'  1='$1'  2='$2'"
echo "== Specs de step disponíveis (leia docs/steps/step-<STEP>.md) =="
ls docs/steps/ 2>/dev/null || echo "(sem docs/steps/ — peça ao orquestrador)"
echo "== Schema relacional atual =="
sed -n "1,120p" reference/schema.md 2>/dev/null
echo "== Git =="
git status --short
```

Regras do Product DNA (obrigatórias, NÃO violar)

* Nada de score espiritual / ranking de pessoas. Movimento e participação, sim; julgamento espiritual, não.
* Dados antes da UI: leia do banco real. NUNCA invente números ou dashboards fake.
* Toda ação relevante gera histórico em timeline_events.
* Milestones espiritualmente significativos (ex: "Convertido", "Batizado") exigem confirmação humana, nunca automáticos.
* Nada de módulo isolado: conecte a Home, Signals, Timeline, Sticks.
* RLS: select SEM filtro de org; insert/upsert COM org_id = ORG_ID.
Pipeline (não pule etapas)

1. PLANO — escreva `.tmp/step-<STEP>-<FASE>/plan.md` separando claramente: a) SCHEMA (banco): tabelas/colunas/RLS novas necessárias, como SQL proposto. b) FRONT (app): arquivos a criar/alterar em core/ ui/ views/, preservando o que já existe. c) Checklist do DNA acima. PARE e me mostre o plano em até 12 linhas. NÃO aplique schema você mesmo.
2. SCHEMA — se precisar de banco, escreva o SQL proposto em `.tmp/step-<STEP>-<FASE>/migration.sql` e PARE: o orquestrador (via Gaybiel) aplica no Supabase com RLS/advisors. Só continue depois que ele confirmar (`.tmp/step-<STEP>-<FASE>/SCHEMA-READY.md`) que as tabelas + políticas existem. Se a fase não precisar de schema, diga isso e siga.
3. IMPLEMENTAR — construa o front + camada de dados seguindo os padrões do repo (ex: core/sticks-repo.js, core/journey-repo.js). Não quebre nada. Regra de ouro: NÃO mude o HTML das telas ainda na paridade; telas que graduam de migração p/ feature saem do `VIEWS` de `test/compare.mjs` e ganham smoke em `FEATURE_VIEWS`.
4. VERIFICAR — rode /verify-app até ficar verde.
5. VALIDAR DADOS — se tocou no banco (escrita nova), faça o teste MCP de insert sob RLS + rollback (padrão da Fase 2), incluindo bloqueio cross-org. Tabela-filha sem org_id (ex.: group_members, attendance_records) → valida via grupo/sessão-pai.
6. COMMIT — `feat(step<STEP>-<FASE>): <descrição>`. Escreva `.tmp/step-<STEP>-<FASE>/report.md` e devolva um resumo de até 5 linhas.
