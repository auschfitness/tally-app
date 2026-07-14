# Feature: Journey Map (read-only)

Como as pessoas se movem pelos estágios: distribuição, tempo no estágio, funil/
evasão e tendência de movimento. **Só dado real** (DNA #2/#3) — sem ranking espiritual.

## Arquivos-chave
- `domain.ts` — `journeyStats`, `journeyFunnel`, `journeyMovement`, `firstVisitDrop`,
  `STUCK_DAYS`. Portados 1:1 de derived.js. Usa `JOURNEY` do domínio de Sticks.
- `queries.ts` — `loadJourneyData`: entered_stage_at (stick_journey_records),
  eventos de mudança (timeline_events event_type='journey_stage_change'), e codes de
  milestone por Stick (milestones + milestone_types).
- `components/JourneyBoard.tsx` — client fino: só o foco de estágio (drill-down) é
  interativo; toda a estatística é computada no servidor (RSC) e passada pronta.
- `journey.module.css`.

## Tabelas Supabase
- `stick_journey_records`, `timeline_events`, `milestones`, `milestone_types`,
  `journey_stages` (posição via domínio de Sticks). Sem mutações (feature de leitura).

## Rota
- `/journey`.

## Paridade
- `avgDays`/`stuck` dependem de `entered_stage_at`; Sticks sem registro não entram na
  média (igual ao legado). Movimento vem de timeline_events (começa vazio e tudo bem).
- Drill-down de estágio: no legado abria o perfil da Stick; aqui leva para `/sticks`
  (o perfil completo entra quando a página de detalhe de Stick migrar).
