---
name: migrate-entity
description: Migra UMA entidade do Tally do blob app_state para as tabelas relacionais do Supabase, mantendo UI e lógica intactas. Argumento: nome da entidade (sticks, groups, prayer, finance...). Invocar como /migrate-entity <entidade>.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Migrar a entidade "$ARGUMENTS" de app_state para relacional

Contexto pré-carregado:
!```
echo "== Onde a persistência acontece hoje =="
grep -rn "app_state\|function load\|function save" src/ 2>/dev/null | head -40
echo
echo "== Esquema relacional da entidade =="
grep -i -A 2 "$ARGUMENTS" reference/schema.md 2>/dev/null || echo "(veja reference/schema.md)"
echo
git status --short
```

Regras (Product DNA — obrigatórias)

* Dados antes da UI: leia do banco real, não invente números.
* Uma pessoa = uma Stick; toda entidade referencia sticks.
* Não quebre nada que já funciona. Preserve telas e lógica.
* O RLS já filtra por org: NUNCA filtre por org_id na mão no client.
* Toda ação relevante vira histórico em timeline_events, quando aplicável.

Pipeline (não pule etapas)

1. PLANO — escreva `.tmp/migrate-$ARGUMENTS/plan.md`: para cada campo do state dessa entidade, a coluna correspondente (use reference/schema.md), quais funções de leitura/escrita trocam, e o que continua igual. PARE e me mostre o plano em no máximo 10 linhas antes de codar.
2. IMPLEMENTAR — troque a leitura/escrita SÓ dessa entidade: ler da tabela via supabase-js, escrever via upsert. Mantenha o restante do app_state intacto para as entidades ainda não migradas.
3. VERIFICAR — rode /verify-app. Se vermelho, corrija até ficar verde. Não avance com vermelho.
4. REGISTRAR — escreva `.tmp/migrate-$ARGUMENTS/report.md` (o que mudou, arquivos tocados, resultado do verify) e faça commit: `migrate($ARGUMENTS): app_state -> relacional`.
5. Devolva um resumo de no máximo 5 linhas.
