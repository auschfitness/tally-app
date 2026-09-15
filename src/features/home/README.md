# Feature: Home / Pulse (/)

A tela de entrada: o "Pulse" da igreja — Care (quem precisa de atenção), frequência,
grupos em atenção, comunidade, estudo e "Para celebrar".
A **última** tela migrada. Ver `docs/handoffs/home-supabase.md`.

## Agregação pura (sem tabela/view/RPC nova)
Como o Calendar, a Home **não** tem lógica de banco própria: ela REUSA as queries já
migradas + a saída do **Signals engine**. `loadHomeData` reaproveita o **mesmo
`buildSignalsInput` do Inbox** (que reúne sticks/groups/teams/services/events +
presença/milestones) e soma orações, estudo e jornada — tudo em paralelo no RSC.

## Arquivos-chave
- `domain.ts` — puro + testes: `flaggedPeople` (painel Care, via `careReasons`),
  `weeklyAttendance` (frequência REAL), `communityInsights`,
  `homeVisibleSignals`, `celebrations`, `todayCounts`.
- `queries.ts` — `loadHomeData` (assembler: buildSignalsInput + prayers + study + journey).
- `components/` — `HomeView` (Server; todos os painéis), `FrequencyChart` (SVG).
- Rota `/` (substitui o placeholder).

## ⚠️ Correção honesta — Frequência agora é dado REAL (DNA #2)
O legado (`attendanceSeries`) **inventava** a série de presença (`base × fatores`) —
o próprio CLAUDE.md marcava isso como ilustrativo "a trocar por dado real". Aqui a
**Frequência vem das sessões de culto reais** (`attendance_sessions`,
`context_type='service'`), somando os presentes por semana (últimas 8). Sem histórico
→ estado vazio honesto, nunca números fabricados. Mesma régua para o resto: todo
painel projeta relação real.

## Fonte dos Signals / Pulse
Mesmo motor do Inbox: `signals(input, new Date())`. A Home usa `homeVisibleSignals`
(esconde só **dispensados** — adiados/atribuídos ainda contam no Pulse, paridade com
`activeSignals` do legado, diferente do feed do Inbox que também oculta esses).

## Decisões / paridade
- **Quase tudo é Server Component** (leitura). As AÇÕES moram nas features: o botão
  "Marquei presença" do Care legado foi **omitido** (presença se registra em
  Groups/Services); "Ver Stick" idem (sem rota `/sticks/[id]`). A Home é dashboard.
- **Sem donut de "Risco pastoral"** (removido): era um score de risco, proibido pelo
  DNA #3 ("sem score de risco/engajamento/espiritual"). O painel **Care** ao lado já
  entrega a mesma informação de forma acionável — nome + contexto — e herdou a única
  contagem que o donut tinha: uma linha "N de M pessoas do campus". Nenhum gráfico
  entrou no lugar. Com isso a linha de baixo virou **Frequência + Grupos em atenção**
  (o `.row2` de duas colunas não pode ficar com uma coluna só: vira vão morto).
- **Filtros de risco e seleção de semana** (`dashRisk`/`dashWeek`) do legado foram
  omitidos (eram conveniências de cliente) — a Home mostra a visão padrão. Reintroduzir
  como searchParams é fácil se necessário.
- **Painéis de Estudo e "Para celebrar" somem inteiros** quando não há dado (evita
  seção vazia), como no legado.
- **Custo**: a Home dispara muitas leituras, todas em `Promise.all` no RSC (sem N+1).
  Se ficar pesada com volume real, o handoff prevê uma RPC de resumo (ação do
  orquestrador) — por ora, camada de app.
- **Badge do Inbox no nav** pode ser ligado agora reusando este assembler; segue 0
  por ora (decisão registrada no README do Inbox).
