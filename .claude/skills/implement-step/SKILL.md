---
name: implement-step
description: Constrói UMA fase de uma step do roadmap Tally (Notion #4–#12) de ponta a ponta. Argumentos: número da step e a fase (ex: /implement-step 4 fase1). Invocar como slash command.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Construir a Step $1 · $2

Contexto pré-carregado:
!```
echo "== Spec da step =="
sed -n "1,400p" docs/steps/step-$1.md 2>/dev/null || echo "(faltando docs/steps/step-$1.md — peça ao orquestrador)"
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

1. PLANO — escreva .tmp/step-$1-$2/plan.md separando claramente: a) SCHEMA (banco): tabelas/colunas/RLS novas necessárias, como SQL proposto. b) FRONT (app): arquivos a criar/alterar em core/ ui/ views/, preservando o que já existe. c) Checklist do DNA acima. PARE e me mostre o plano em até 12 linhas. NÃO aplique schema você mesmo.
2. SCHEMA — escreva o SQL proposto em .tmp/step-$1-$2/migration.sql e PARE: o orquestrador (via Gaybiel) aplica no Supabase com RLS/advisors. Só continue depois que ele confirmar que as tabelas + políticas existem.
3. IMPLEMENTAR — construa o front + camada de dados seguindo os padrões do repo (ex: core/sticks-repo.js). Não quebre nada.
4. VERIFICAR — rode /verify-app até ficar verde.
5. VALIDAR DADOS — se tocou no banco, faça o teste MCP de insert sob RLS + rollback (padrão da Fase 2), incluindo bloqueio cross-org.
6. COMMIT — "feat(step$1-$2): <descrição>". Escreva .tmp/step-$1-$2/report.md e devolva um resumo de até 5 linhas.
