# Feature: Inbox (/inbox)

O feed pastoral: os Signals que a igreja deveria notar, com filtros por categoria e
ações (Adiar / Dispensar / Atribuir Care). Ver `docs/handoffs/inbox-supabase.md`.

## ⚠️ Fonte da verdade — engine, NÃO a tabela `signals`
Confirmado no legado (`src/views/inbox.js` + `derived.js`) e no handoff: o Inbox é
**engine-derived**. Os Signals são **calculados ao vivo** pelo motor puro
(`features/signals/domain.ts`, já concluído) a partir das fontes já migradas; o
**status** de cada signal persiste em **`signal_overrides`** (por `signal_key`,
UNIQUE org_id+signal_key → upsert). A tabela `signals` **não é lida** (fica reservada
para persistência futura — se um dia for a fonte, é decisão/RLS do orquestrador).

## Arquivos-chave
- `queries.ts` — `buildSignalsInput` (assembler que REUSA `listSticks`/`listGroups`+
  `groupsHealth`/`listTasks`/`loadTeamsData`/`listServices`/`listEvents` + partes sob
  medida: todas as sessões de presença, `milestonesByStick`, inscrições, overrides).
  `loadOverrides` (signal_key→status).
- `domain.ts` — puro + testes: `CATEGORIES`, `LEVEL_RANK`, `statusOf`,
  `visibleSignals` (esconde dispensado/adiado/atribuído + ordena por nível),
  `feedFor` (categoria), `levelColor`.
- `actions.ts` — `setSignalStatusAction` (Adiar=snoozed / Dispensar=dismissed,
  upsert em signal_overrides) e `assignCareFromSignalAction` (cria Care + marca
  `assigned`).
- `components/` — `InboxFeed` (chips + linhas + ações), `AssignCareModal`.
- Rota `/inbox`.

## Modelo de status
`signal_overrides.status` é texto livre. O motor conhece `new|seen|dismissed`; o
Inbox preserva também `snoozed` (Adiar) e `assigned` (virou Care), como o legado.
Só `new`/`seen` aparecem no feed (o resto é ocultado por `visibleSignals`).

## Ligação com Care (fecha o loop diferido)
"Atribuir" cria um `care_items` a partir do signal. Como o Inbox é **engine-derived**
(sem linha em `signals`), `care_items.signal_id` fica **NULL** e o contexto do signal
(título + porquês) vai em `title`/`description`/`category="Signal"` do item — decisão
documentada (handoff de Care/Inbox). O signal some do feed (override `assigned`).
Exige `care.view` (a permissão real do Care).

## Fonte dos milestones (celebrações)
`peopleSignals` marca celebrações a partir de `milestonesByStick`. FONTE = tabela
relacional **`milestones`** (Journey/Trilhas gravam nela), não o blob `app_state`
(diferente do legado). `code` (ou `milestone_type_id`→`milestone_types.code`) vira o
`type`; `occurred_on` vira a data.

## Decisões / paridade
- **Filtro de categoria no cliente** (estado efêmero): o servidor manda os visíveis
  já ordenados; o chip filtra em memória (sem round-trip). Chips e ordem por nível
  (attention→notice→celebration) idênticos ao legado.
- **"Abrir" (perfil da Stick)** omitido: ainda não há rota `/sticks/[id]`.
- **Badge do nav (contador do Inbox)** segue **0** por ora: computar o feed inteiro no
  layout de todas as páginas seria caro. Entra quando a Home agregar o engine (o mesmo
  `buildSignalsInput`) — aí o número real pode ser compartilhado.
- **`now` injetado** no engine (page passa `new Date()`); o domínio é determinístico.
