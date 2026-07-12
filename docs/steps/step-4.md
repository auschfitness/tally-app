# TALLY — STEP 4 · JOURNEY, GROUPS & COMMUNITY

Colocar em `tally-app/docs/steps/step-4.md`. Fonte: caderno Notion "Tally" › #4.
Construir SOBRE o app existente. Camada de comunidade e crescimento.

Objetivo não é só gerenciar grupos. É a igreja entender: como as pessoas se conectam, como crescem, onde travam, onde se formam relações, onde acontece discipulado. **Nunca reduzir crescimento espiritual a um score.** O produto gerencia movimento operacional e participação; transformação espiritual fica com Deus e a igreja local.

## 1. Conceito central: JOURNEY
O caminho de uma pessoa pela vida da igreja. O antigo "funil de visitante" evolui para Journey. Um visitante não é um lead; um membro não é um cliente convertido. Journey ajuda a igreja a entender **movimento**.

Journey padrão de exemplo: FIRST CONTACT → FIRST VISIT → RETURNED → CONNECTED → JOINED COMMUNITY → SERVING → LEADING.

Estágios são **operacionais, não rankings espirituais**. NÃO comunicar "Estágio 5 é melhor que Estágio 2". Comunicar "esta pessoa entrou em uma nova área de participação".

## 2. Journeys customizáveis
Igrejas usam linguagens diferentes. Suportar: nomes de estágio custom, ordem, descrição, milestones requeridos, ações recomendadas, gatilhos de automação.

## 3. Modelo de dados Journey
- **Journey**: id, church_id, name, description, stages
- **Journey Stage**: id, journey_id, name, description, order, color, required_milestones, recommended_actions
- **Stick Journey Record**: id, stick_id, journey_id, current_stage_id, entered_stage_at, previous_stage_id, completed_stages, notes

Cada Stick pode ter uma Journey primária. Futuro: múltiplas journeys (novo convertido, liderança, casamento, kids).

## 4. Visualização Journey
Experiência primária NÃO é pipeline de CRM, é **movimento visual**. Criar JOURNEY MAP: cada estágio mostra nº de Sticks, tendência de movimento, tempo médio no estágio, drop-off. Clicar num estágio abre os Sticks relacionados.

## 5. Journey Insights
Gerar insights só quando há dado real (ex.: "a maioria dos visitantes some entre a 1ª e a 2ª visita"; "42 visitantes voltaram mas não entraram em grupo"). **Não inventar conclusões.**

## 6. Journey Actions
Cada estágio sugere ações (ex.: Returned → convidar pra Next Steps, conectar com líder, recomendar grupo). Ações criam: Signals, Tasks, Care Items, Milestones.

## 7. Conexão com Milestones
Journey depende de Milestones (1ª visita → milestone; voltou 2x → milestone; entrou em grupo → milestone). Milestones atualizam a Journey quando configurado. **Nunca atribuir milestones espiritualmente significativos automaticamente** (ex.: "Convertido" só por presença). Exigir confirmação humana.

## 8-9. Groups como entidade relacional
Grupos são ambientes relacionais (small groups, células, estudos, jovens, casais, oração, classes, discipulado). Onde o pertencimento acontece.
- **Group**: id, church_id, campus_id, name, description, type, leader_id, co_leader_ids, meeting_day, meeting_time, location, capacity, status, created_at
- Tipos: Small Group, Discipleship, Prayer, Youth, Kids, Marriage, Class, Other
- **Group Membership**: group_id, stick_id, role, joined_at, left_at, status
- Papéis: Member, Leader, Co-leader, Host

**Nunca armazenar grupos como campo de texto simples. Grupos são entidades relacionais.**

## 10-13. Página e detalhe de Groups
Redesenhar Groups como overview de comunidade. Pergunta central: "Onde as relações estão acontecendo na nossa igreja?" Mostrar TOTAL GROUPS, ACTIVE GROUPS, PEOPLE CONNECTED, GROUP HEALTH, GROUP MOVEMENT. Evitar lista simples como experiência principal.

Group cards: nome, tipo, líder, campus, membros, horário, indicador de saúde, atividade recente.

Group detail responde "o que está acontecendo dentro desta comunidade?": Overview, Members, Attendance (tendência, quem está sumindo), Journey, Care context (só info autorizada, ex.: "2 membros têm Care Items abertos", sem expor detalhes).

## 12. Group Health
Visualização de saúde de **participação/operacional, não score espiritual**. Considerar: consistência de presença, atividade de reuniões, movimento de membros, atividade do líder, novos membros, ausência de registros. Ex.: "Grace Group — participação saudável (presença estável, 2 novos, líder ativo)"; "Northside — precisa de atenção (presença caiu 5 semanas, sem registro recente)".

## 14-15. Group Attendance & Signals
Preservar presença existente, melhorar pra grupos (líder abre grupo → Record Attendance → Presente/Ausente/Visitante → salva → cria records, signals possíveis, timeline). Group Signals: ATENÇÃO ("presença caiu 4 semanas", "sem registro", "sem líder ativo") e CELEBRAÇÃO ("+5 membros", "multiplicou em dois grupos").

## 16. Group Map (opcional)
Visualização geográfica pra multi-campus. Cada grupo = marcador (nome, líder, horário, capacidade, membros). Onde há concentração? Onde falta? Onde poderia nascer um grupo?

## 17-18. Discipleship Tracks
Trilhas de crescimento intencional (Fundamentos do Novo Convertido, Curso de Casamento, Desenvolvimento de Liderança, Preparação pro Batismo, Classe de Membresia).
- **Track**: id, name, description, stages, materials, completion_requirements
- **Track Enrollment**: stick_id, track_id, current_step, progress, started_at, completed_at

Conclusão cria Milestone, movimento de Journey (se configurado), timeline event.

## 19. Community Connection View (futuro)
COMMUNITY MAP: "quão conectada é nossa igreja?" Visualizar Sticks, Groups, Teams, relações. Evitar grafo estilo rede social ilegível. Focar em padrões úteis: pessoas sem comunidade, grupos sem novatos, áreas de baixa conexão.

## 20. Integração com Home
Journey e Groups alimentam a Home: "23 visitantes voltaram este mês", "14 entraram em grupos", "3 grupos precisam de atenção", "Grace Group multiplicou", "42 visitantes não deram o próximo passo".

## 21. ORDEM DE IMPLEMENTAÇÃO (as 6 fases)
- **Fase 1**: arquitetura de Journey; estágios; conectar Sticks.
- **Fase 2**: visualização Journey; analytics de movimento.
- **Fase 3**: refatorar Groups; conectar Groups a Sticks (group_members).
- **Fase 4**: Group Health; Group Signals.
- **Fase 5**: Discipleship Tracks; conectar Tracks a Journey e Milestones.
- **Fase 6**: Community Insights; conectar Groups e Journey à Home.

## 22. DEFINITION OF DONE
Journey existe como conceito central; Sticks se movem por estágios; Journey é visual (não só pipeline); estágios customizáveis; Groups relacionais; membership conecta a Sticks; presença de grupo cria contexto; Group Health existe; Group Signals existem; Discipleship Tracks existem e conectam a Journey/Milestones; Home entende movimento de comunidade.
