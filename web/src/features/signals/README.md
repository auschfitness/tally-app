# Feature: Signals engine (motor de inteligência)

O coração do "um pastor vê o um" (DNA #1/#3). Deriva **Signals** — contexto e
oportunidades de cuidado, **nunca score** — a partir de fontes que já existem no
app. Não é uma tela: é um **domínio puro compartilhado** que alimenta **Care,
Inbox e Home**. Migrado ANTES dessas três, porque elas dependem dele.

## Arquivos-chave

- `domain.ts` — motor puro e determinístico. Portado 1:1 de `src/core/derived.js`
  (`signals`, `serviceSignals`, `serviceEventSignals`). Funções:
  - `peopleSignals` — atenção (≥3 semanas sem aparecer), visitante sem grupo,
    follow-up aberto, e milestones recentes (≤21 dias) como celebração.
  - `groupHealthSignals` — saúde baixa (banda `risk`), sem líder, crescimento,
    saídas, e presença parada (>21 dias, só p/ grupo que já registrou).
  - `taskSignals` — tarefas designadas em aberto.
  - `serviceSignals` — times/escala: time vazio/pequeno/sem líder, conectado que
    não serve, começou a servir, e cuidado por muitas semanas seguidas.
  - `serviceEventSignals` — cultos/eventos: queda de presença, recorde, visitante
    no último culto, escala sem cobertura, evento próximo (≤14 dias).
  - `signals(input, now)` — compõe todos, na mesma ordem do legado.
  - `activeSignals` / `signalsFor` / `sigStatus` — aplicam overrides
    (`new | seen | dismissed`) sobre a lista.
- `domain.test.ts` — testes de unidade (paridade com derived.js, por ramo).

## Interface limpa (não é tela, é contrato)

Todas as funções recebem os dados e o `now: Date` como parâmetros — **sem estado
global, sem `today()`** — para serem testáveis e reusáveis. Cada feature-fonte
(Teams, Services, Events) fornecerá coleções no formato das interfaces daqui
(`SignalPerson`, `Team`, `Service`, `ChurchEvent`, etc.) via sua camada de
queries. `people` e `groupsHealth` já vêm dos domínios de **Sticks** e **Groups**.

## Tabelas Supabase

Nenhuma diretamente — o motor não consulta o banco. As fontes (sticks, groups,
group_members, attendance_*, coordination_tasks, teams, team_members,
schedule_assignments, services, events, event_registrations, milestones) são lidas
pelas queries de cada feature e passadas prontas. Overrides ficam em
`signal_overrides` (leitura/escrita entram com Inbox).

## Paridade (mudanças documentadas)

- **`esc()` removido** do título de tarefa: no legado o texto era escapado como
  HTML; aqui o título é dado puro e o **React escapa na renderização** — saída
  exibida equivalente, sem HTML vazando para o domínio.
- **`teamNames` (código morto)** de `serviceEventSignals` foi omitido: era
  calculado de `state.teams` e nunca usado.
- **Filtro de arquivados** (`!p.archived`) da oportunidade "conectado não serve"
  sai do domínio: a `Person` migrada não tem `archived` e a query exclui
  arquivados a montante — resultado equivalente.
- Limiar de atenção fixo em **3 semanas** (como no legado `signals()`, que ignora
  `state.careWeeks`). O `careReasons` de Sticks usa o configurável; são regras
  distintas e ambas preservadas.

## Consumidores (próximos)

`Care` (`/care`), `Inbox` (`/inbox`) e `Home` (`/`). Cada um chama `signals(...)`
com as fontes que já tiver migrado e aplica `activeSignals` com os overrides.
