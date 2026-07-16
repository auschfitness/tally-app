# Feature: Sticks (pessoas)

"Uma pessoa = uma Stick." Lista de pessoas da igreja com composição, engajamento,
filtros e cadastro. É a entidade central — outras features referenciam Sticks por id.

## Arquivos-chave
- `domain.ts` — **interface pública** desta feature (tipos e regras que Care, Home,
  Journey, Groups importam): `Relationship`, `JOURNEY`, `careReasons`, `careLevel`,
  rótulos. Regras portadas 1:1 de `helpers.js`/`derived.js` (sem score — DNA #3).
- `types.ts` — `Person` (view model) e `PersonInput` (entrada de formulário).
- `queries.ts` — `listSticks` (mapeia `sticks` + estágio de jornada + campus + grupo)
  e `listGroupNames`. Só campos necessários; tipado; RLS filtra por org.
- `schema.ts` — validação da entrada de pessoa (fronteira de Server Action).
- `actions.ts` — `createStickAction`, `updateStickAction`, `archiveStickAction`
  (valida → sessão/org no servidor → Supabase → `revalidatePath`).
- `components/SticksBoard.tsx` — board interativo (Client): filtros/busca (estado em
  URL), composição, engajamento, tabela, abre o modal.
- `components/PersonModal.tsx` — cadastro/edição/arquivar (Client, Server Actions).

## Tabelas Supabase
- `sticks` (campos próprios: nome, relação, líder, campus, última presença, follow-up,
  primeira visita, origem, estágio de jornada, arquivado).
- `journey_stages` (position ↔ código da jornada), `campuses` (id ↔ nome),
  `groups` + `group_members` (grupo ativo da pessoa).

## Rotas
- `/sticks` — lista + cadastro. Filtros compartilháveis por querystring (`q`, `rel`, `care`).

## Depende do compartilhado
- `lib/auth/session` (requireOrg), `lib/supabase/*`, `lib/errors` (ActionResult),
  `lib/utils/date`, design-system global (panel/table/chip/ministrip/engbar/modal).

## Paridade — o que ainda NÃO migrou (documentado; ver docs/migration-matrix.md)
- **Perfil completo da Stick** (abas Visão geral / Timeline / Presença) e **milestones**:
  dependem de attendance (sessões) e dos milestones que ainda vivem no `app_state`.
  Nesta fase o clique na linha abre o modal de edição.
- **Coluna "Sinais"**: volta quando Inbox/Signals migrar; por ora a coluna Relação já
  mostra "Atenção" (careReasons) como no `relChip` atual.
- **Check-in de presença**: migra junto com Services/Attendance.
- **Eventos de timeline de entrada/saída de grupo**: escritos quando a feature Groups
  migrar; a associação de grupo em si já é gravada em `group_members`.
- **Composição**: donut renderizado por CSS (conic-gradient); o gráfico Chart.js
  compartilhado (linha de frequência etc.) entra com o componente de charts.
