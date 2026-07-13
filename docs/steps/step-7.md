# TALLY — STEP 7 · TEAMS, VOLUNTEERS & MINISTRIES (spec + plano autônomo)

Fonte: Notion "Tally" › #7. Construir SOBRE o app existente. Camada de serviço/ministério.
Objetivo: entender quem serve, onde usa os dons, quais times estão saudáveis, onde líderes estão sobrecarregados, onde ministérios dependem de pouca gente. Mover pessoas de presença → participação. **Sem score espiritual; consciência operacional, não RH/rating.**

## Conceitos
- **Teams**: grupos de pessoas servindo juntas numa responsabilidade (Louvor, Recepção, Kids, Produção...). Diferente de Groups: Groups = onde a pessoa **pertence**; Teams = onde a pessoa **serve**. Uma Stick pode estar em vários Groups e vários Teams.
- **Ministries**: área mais ampla que contém Teams (Ministério de Louvor → Time de Banda, Produção, Mídia).
- **Serving relationship**: Stick ↔ Team (com papel, status, disponibilidade). Voluntário NÃO precisa de login no Tally.
- **Schedules**: escala que conecta Serviço/Evento → Time → Papel → Stick.

## SCHEMA — JÁ APLICADO pelo orquestrador (migração m19). NÃO tocar no banco.
Todas com `org_id` + RLS `is_org_member`. `services` e `events` já existiam (alvos de FK).
- **ministries**: id, org_id, campus_id, name, description, leader_id (fk sticks), color, status ('active'|'inactive'|'archived'), created_at.
- **teams**: id, org_id, ministry_id (fk ministries), campus_id, name, description, leader_id (fk sticks), serving_roles (jsonb: array de papéis), status, created_at.
- **team_members**: id, org_id, team_id (fk teams), stick_id (fk sticks), role, status ('active'|'paused'|'inactive'), availability, joined_at, notes, created_at. UNIQUE (team_id, stick_id).
- **schedule_assignments**: id, org_id, service_id (fk services), event_id (fk events), team_id, role, stick_id, assignment_date, status ('assigned'|'confirmed'|'declined'|'replacement_needed'|'completed'), confirmed_at, created_at.

## FASES (ordem do doc §23). Front por fase; schema já pronto.
- **Fase 1**: Ministries + Teams + conectar Sticks. `teams-repo.js`/`ministries-repo.js`, módulo/nav "Times" (ou "Serviço"), CRUD, ligar Stick a Team (team_members). Vazio honesto.
- **Fase 2**: relação de serviço + dashboards de time. Distribuição de serviço, papéis, membros. Dashboard do ministério (§16-17).
- **Fase 3**: escala (scheduling, §11-13). Board visual (semanal/mensal), Serviço/Evento → Time → Papel → Stick, status. Evitar cara de planilha; usar avatares.
- **Fase 4**: Team Health (§7-8) — consciência operacional (tamanho, distribuição, "4 pessoas cobriram 72%..."). Sem score.
- **Fase 5**: Signals de serviço (§9, §20) — "serviu 10 semanas seguidas", "time depende de 3 pessoas", "15 conectados não servem". Alimenta Inbox/Home. Conectar a Journey (§10: começar a servir → Milestone + Journey 'Servindo') e Care (§21).
- **Fase 6**: base de desenvolvimento de liderança (§18) — jornada Servindo→Aprendiz→Co-líder→Líder (leve, sem score).

## AUTONOMIA (igual ao lote do Step 5)
Fazer na ordem 1→6; comitar cada fase (`feat(step7-faseN): ...`); `/verify-app` verde + verificação no navegador; validação MCP nas tabelas tocadas (fases 1-3); **NÃO tocar no banco** (schema já aplicado; se achar que falta tabela, PARE e escreva `.tmp/step-7-faseN/BLOCKED.md`); em dúvida menor, escolher padrão seguro e anotar no report; DNA + RLS + terminologia PT-BR (termos de produto protegidos ficam em inglês). Telas novas → smoke. Ao fim, `.tmp/step-7-DONE.md`.

## DNA específico
- Serviço conecta a Stick (perfil mostra "Serve em: Louvor, desde jan/2026, 32 cultos"), Timeline, Journey, Signals, Care. Não é ilha.
- Nada de cara de software de RH, "funcionário", nota de desempenho. São pessoas servindo juntas.
