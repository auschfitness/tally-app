# Plano — migrate(sticks): app_state → tabela relacional `sticks`

## Escopo
Cutover de **leitura + escrita** dos campos PRÓPRIOS da pessoa para a tabela `sticks`.
Três campos que hoje moram no objeto Stick são de OUTRAS entidades (têm tabela e
migração próprias) e ficam **fora** deste passo, continuando no `app_state` como hoje:
`group` (→ group_members), `milestones[]` (→ milestones), `household` (→ households).
Assim nada regride: o objeto `people[i]` passa a ser {campos próprios vindos da tabela}
+ {group/milestones/household vindos do app_state, casados por `id`}.

## Mapa de campos  `people[]` → `sticks`
| app | coluna | notas |
|---|---|---|
| id (uid) | id (uuid) | o banco gera; vira o `id` da pessoa no app |
| name | full_name | |
| relationship | relationship_status | enum idêntico |
| roles:["leader"] | is_leader | |
| campus (nome) | primary_campus_id | resolver nome→id via `campuses` |
| lastSeen | last_seen_at | |
| followup | followup_open | |
| firstVisit | first_visit_date | |
| source | source | |
| birthDate | birth_date | |
| journeyStage (código) | journey_stage_id | resolver via `journey_stages` (name/position) |
| (arquivar) | archived | "Arquivar" vira archived=true (soft); a lista filtra archived=false |

## Arquivos que mudam
- **NOVO** `src/core/sticks-repo.js`: `loadSticks()` (lê sticks + campuses + journey_stages, monta os objetos person), `upsertStick(person)` e `archiveStick(id)` (resolvem nome↔id; enviam `org_id: ORG_ID` na escrita).
- `src/core/supabase.js` (`loadOrg`): depois de carregar o `app_state`, chamar `loadSticks()` e **mesclar** os sub-campos (group/milestones/household) que estão no app_state, casando por `id`; setar `state.people`. Se a tabela estiver vazia e o app_state tiver pessoas (org antiga), fazer backfill: inserir na tabela e adotar os uuids.
- `src/views/sticks.js`: no `personModal` (salvar novo/editar) chamar `upsertStick`; no "Arquivar" chamar `archiveStick`; no check-in atualizar last_seen via `upsertStick`.
- `src/core/events.js`: no `data-seen` ("Marquei presença") atualizar last_seen via `upsertStick`.
- `src/core/persist.js` (`save`): **inalterado** — segue gravando o app_state (guarda os sub-campos e serve de backup). Sem duplicar fonte de verdade dos campos próprios (a tabela manda na lista).

## O que NÃO muda
Todo o código de render/telas/gráficos (`derived.js`, `home/sticks/groups/...`) — lê `state.people` em memória, igual a hoje. `/verify-app` (paridade) deve seguir verde.

## Cuidados
- `org_id` obrigatório no insert/upsert (NOT NULL); RLS filtra as leituras — não passar org_id na leitura.
- name→id: carregar `campuses` e `journey_stages` uma vez; se faltar um campus, criar antes.
- Enum `relationship_status` bate 1:1 com os valores do app.

## Verificação (importante)
`/verify-app` confirma que a UI não quebrou, mas **NÃO** testa o Supabase (o teste injeta dados na memória, sem login). Então além do /verify-app, farei um **teste real no navegador**: logar/criar igreja, adicionar uma pessoa, recarregar e ver que ela vem da tabela `sticks`; conferir a linha no banco via MCP.
