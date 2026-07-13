# Step 5 — LOTE AUTÔNOMO (Fases 4, 5, 6) — execução sem o orquestrador no meio

O dono vai ficar ~3h fora. Execute as TRÊS fases em sequência, sozinho, comitando cada uma (o hook publica). Todo o schema necessário JÁ FOI APLICADO pelo orquestrador. Você NÃO precisa esperar por ninguém.

## SE VOCÊ ESTÁ RETOMANDO (ler antes de tudo)
Se esta sessão começou do zero (ex.: reinício ou /clear), NÃO refaça o que já está pronto. Primeiro descubra onde parou:
1. Rode `git log --oneline -20` e veja quais fases já têm commit (`feat(step5-faseN)`, `feat(step7-faseN)`).
2. Olhe `.tmp/` por reports/DONE já escritos.
3. Continue a partir da PRÓXIMA fase incompleta da fila (Step 5 Fases 4→5→6, depois Step 7 Fases 1→6). Não repita fase já comitada.
Assim, um único "continue" retoma sem retrabalho.

## REGRAS DE AUTONOMIA (ler primeiro)
1. Faça na ordem: **Fase 4 → Fase 5 → Fase 6**. Termine e **comite** cada uma antes da próxima. Nunca deixe trabalho sem commit.
2. **NÃO toque no banco** (não aplique migração, não altere schema). A Fase 4 já tem as tabelas prontas (abaixo). Fases 5 e 6 são **front-only, sem schema**. Se alguma fase parecer precisar de tabela nova, PARE aquela fase, escreva `.tmp/step-5-faseN/BLOCKED.md` explicando, e siga pra próxima.
3. Depois de cada fase: `/verify-app` verde (corrija até ficar), validação MCP (só nas tabelas tocadas — Fase 4), `git commit` "feat(step5-faseN): ...", e escreva `.tmp/step-5-faseN/report.md`.
4. **Em qualquer dúvida menor de UX/produto: escolha o padrão mais simples e seguro, implemente, e ANOTE a decisão no report** pra revisão depois. NÃO pare pra perguntar.
5. **Verifique no navegador** onde der (como você fez na Fase 3): telas renderizam, sem erro no console.
6. DNA sempre: dados reais, estado vazio honesto, sem score espiritual, sem número inventado, RLS (SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID). **Terminologia PT-BR** (nada de inglês na UI, exceto os termos de produto protegidos: Stick, Signal, Care, Journey, Milestone, Pulse, Inbox).
7. Ao terminar as três, escreva `.tmp/step-5-DONE.md` resumindo cada uma pra revisão.

---

## FASE 4 — Notas & Recursos (schema JÁ aplicado — migração m18)

Tabelas prontas (RLS `is_org_member`, advisors limpos):
- **study_notes**: id, org_id, author_id (nullable), title, content, scope ('personal'|'shared', default 'personal'), sermon_id (fk sermons set null), series_id (fk series set null), scripture_ref (text), topic (text), tags (text[]), created_at, updated_at.
- **resources**: id, org_id, title (not null), author, type (book/article/pdf/link/video/quote/doc/other), url, description, topic, tags (text[]), sermon_id (fk sermons set null), created_at.

Front:
- `notes-repo.js` + `resources-repo.js`: hydrate + create/update/delete. RLS: org_id = ORG_ID na escrita.
- No módulo Estudo, adicionar navegação interna pra **Notas** e **Recursos** (a spec §3 prevê sub-seções do Study; use a estrutura de nav que o Study já tiver).
- **Notas**: lista + editor simples (título, conteúdo, escopo pessoal/compartilhada, e vincular opcional a sermão/série/escritura/tópico). Vazio honesto ("Nenhuma nota ainda").
- **Recursos**: lista + adicionar (título, autor, tipo, url, descrição, tópico, tags, sermão relacionado). Filtro por tipo/tópico. Vazio honesto.
- Leve conexão: no editor de sermão, mostrar notas/recursos vinculados àquele sermão (opcional, discreto).
- Telas novas → FEATURE_VIEWS (smoke). Validação MCP: insert study_notes + resources sob RLS + rollback + bloqueio cross-org.
- Commit: `feat(step5-fase4): Notas e Recursos`.

---

## FASE 5 — Busca + Memória de sermão (FRONT-ONLY, sem schema)

- **Busca** (spec §13): buscar em sermões (title, main_passage, big_idea, content), notas (study_notes), escrituras (sermon_scriptures) e séries. Por ora, busca **textual/por relevância no client** (sem embeddings/pgvector — manter grátis e simples). Resultados agrupados por tipo (sermões / notas / referências / séries), com contagem e vazio honesto.
- **Memória de sermão** (spec §12 + visão do dono): enquanto o pastor escreve, sugerir sermões passados **relacionados pelo texto/passagem** (casar por passagem em sermon_scriptures + palavras-chave do content/big_idea). Mostrar no painel direito (assistente de estudo) do canvas, lado a lado.
  - **TOGGLE on/off** (pedido do dono): a sugestão é opcional e desligável. Reaproveite/una com o toggle de reconhecimento de escritura se fizer sentido, mas deixe claro o que cada um liga.
- Nada de schema. Telas/mudanças → smoke. Commit: `feat(step5-fase5): busca e memória de sermão`.

---

## FASE 6 — Teaching + conexões + Home (FRONT-ONLY, sem schema)

- **Study na Home**: superfície de dado real do ensino — último sermão, série atual, atividade recente de estudo. Vazio honesto se não houver. Alimenta a Home como os outros módulos (não é ilha).
- **Conexões** (spec §22): ligar Study ao resto de forma leve, só com o que já existe no relacional:
  - Sermão ↔ Discipleship Tracks / Journey (material de ensino) quando fizer sentido — vínculo leve via ids existentes, sem tabela nova.
  - (services/events são Step 6 — ainda não existem; deixe o gancho preparado no código mas NÃO crie tabela.)
- Se você concluir que uma conexão exige tabela nova, NÃO crie — anote em `.tmp/step-5-fase6/BLOCKED.md` e entregue o que dá sem schema.
- Home muda → gradue pro smoke. Commit: `feat(step5-fase6): conexões de Study e Home`.

---

Ao fim das três, `.tmp/step-5-DONE.md` com um resumo de 3-5 linhas por fase (o que ficou, decisões tomadas nos pontos ambíguos, e qualquer BLOCKED). O dono e o orquestrador revisam fase por fase depois.
