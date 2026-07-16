# Feature: Care (/care)

Cuidado pastoral: Care Items (quem precisa de atenção + o que estamos fazendo), com
histórico de **contatos** e **notas internas**. Migração blob→relacional (o legado
guardava `careItems` no `app_state`; o alvo são `care_items`/`care_notes`/
`care_contacts`). Ver `docs/handoffs/care-supabase.md`.

## Arquivos-chave
- `domain.ts` — puro + testes: rótulos/faixas (prioridade/estado), `isOpen`,
  `sortCareItems` (urgência → prazo), `careSummary`, `splitCare`.
- `queries.ts` — `loadCare` (itens + contatos + notas, nomes resolvidos) e
  `listCareMembers` (responsáveis atribuíveis).
- `schema.ts` / `actions.ts` — criar/editar item, `addCareContact`, `addCareNote`,
  excluir (exige `care.manage`).
- `components/` — `CareBoard`, `CareCard`, `CareItemModal` (criar/editar),
  `ContactModal`, `NoteModal`. Client só nas folhas.
- Rota `/care`.

## Tabelas Supabase
`care_items`, `care_notes`, `care_contacts`. Enums reais: `priority` =
signal_priority (celebration/notice/attention/urgent); `status` = care_status
(new/assigned/in_progress/waiting/resolved/closed). Sem migração (última: m20).

## ⚠️ Pontos do handoff que moldaram a implementação
- **RLS POR PERMISSÃO (diferente do resto do app):** ler/criar/editar Care exige
  `care.view`; excluir exige `care.manage`. A page checa `can(ctx, "care.view")` e
  mostra um estado **"sem acesso" elegante** (não erro); a RLS do banco é a barreira
  real (sem permissão o SELECT volta vazio). **Owner tem tudo** → a fixture de teste
  (owner) exercita o happy path.
- **IDs de PESSOA divergem por papel:** `stick_id` (item/contato) = a **pessoa
  cuidada** → resolvido por `sticks`. `assigned_to`/`author_id`/`contacted_by` = o
  **staff** → são de **`auth.users`**, resolvidos por `memberships`+`profiles`
  (NUNCA sticks). As actions gravam SEMPRE `ctx.user.id` como autor real; o
  "responsável" vem do select de membros.
- **`confidentiality_level` (item) e `visibility` (nota) são RÓTULOS**, não
  segurança: a RLS não separa por item/nota. Gravamos defaults não-nulos
  (`standard` / `team`); confidencialidade real por item = migração de RLS do
  orquestrador (a pedir quando o modelo for decidido).
- **Cascade:** excluir item → CASCADE em notas e contatos (a UI confirma via botão
  Excluir, só com `care.manage`).

## Diferido (documentado, não escondido)
- **Feed de "Sinais aguardando ação"** (legado: criar Care a partir de um Signal):
  depende da **fonte dos Signals** que o handoff de **Inbox** ainda vai decidir
  (engine ao vivo vs. tabela `signals`). Não assumi a fonte aqui — a coluna
  `care_items.signal_id` já é preservada para religar quando o Inbox migrar. Por ora
  o Care é criado manualmente (pessoa + motivo + prioridade + responsável).
- **Teste do caminho NEGATIVO de permissão** (membro sem `care.view` → não vê nada):
  adiado até o orquestrador semear um **usuário de teste não-owner** (ação reservada
  a ele no orchestrator-state). O teste de integração atual roda como owner (happy
  path). O estado "sem acesso" da UI já está implementado e pronto para esse teste.
- **"Ver Stick"** (deep-link ao perfil) omitido: ainda não há rota `/sticks/[id]`.

## Mudanças de comportamento vs. legado
- `assigned_to` agora é o **id do usuário** (auth.users), não uma string de nome —
  FK correta; nome resolvido por profiles. (O legado guardava o nome digitado.)
- **Notas internas** (`care_notes`) não existiam na UI legada (só o log de contatos);
  são uma adição do modelo relacional para registro pastoral.
- Select de pessoa cuidada **não é filtrado por campus** (Care é org-wide); o legado
  filtrava a LISTA de itens por campus ativo.
