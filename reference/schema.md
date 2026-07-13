# Tally · Esquema relacional do Supabase (referência para migração)

Fonte da verdade do banco `zzgxeylyrtzsqcdguxql`. Colocar em `tally-app/reference/schema.md`.
A skill `/migrate-entity` lê este arquivo para saber para quais colunas mapear cada campo do `app_state`.

Regra de ouro: toda tabela operacional tem `org_id` (o RLS filtra por org sozinho, nunca filtre por org na mão no client). `USER-DEFINED` = enum do Postgres; se precisar dos valores, rode `select enum_range(null::<tipo>)` ou `select distinct <coluna> from <tabela>`.

## Cuidados críticos (ler antes de migrar)

- **Leitura vs. escrita e o `org_id`:** ao **ler**, não passe `org_id` (o RLS filtra). Ao **escrever** (insert/upsert), o `org_id` é `NOT NULL` **sem default** → o client **precisa** mandar `org_id: ORG_ID` (o id da org logada, já em `session.js`). Isso é preencher a coluna obrigatória, não "filtrar na mão".
- **Nomes → ids:** o `app_state` guarda **nomes** (campus, grupo, fundo, categoria, estágio); as tabelas usam **uuid** (`*_id`). Carregue a tabela de referência uma vez, monte `nome → id`, e resolva na escrita; se faltar, crie a linha de referência antes.
- **Ids:** não reaproveite o `uid()` curto do app; deixe o banco gerar o `uuid` e guarde o retorno.
- **Datas:** `date` = `YYYY-MM-DD` (formato que o app já usa); `timestamptz` tem default `now()`.

### Valores dos enums (lidos do banco em 2026-07-12)
- `relationship_status` (sticks): `visitor_first, visitor_returning, attendee, member, inactive` — **iguais** aos do app.
- `group_member_role` (group_members): `member, leader, co_leader, host`.
- `prayer_privacy` (prayer_requests): `church, group, leader, private` — **iguais** aos do app.
- `entry_type` (finance_entries/categories): `in, out` — **iguais** aos do app.
- `signal_priority` (signals, care_items): `celebration, notice, attention, urgent` — **minúsculas** (o app usa "Notice/Attention/Urgent" no Care → mapear p/ minúsculo).
- `care_status` (care_items): `new, assigned, in_progress, waiting, resolved, closed`.
- `signal_status` (signals): `new, seen, assigned, in_progress, resolved, dismissed`.
- `attendance_status` (attendance_records): `present, absent, excused, unknown`.
- `attendance_context` (attendance_sessions): `service, group, event, teaching`.

### Gotchas por entidade
- **care.assignedTo:** o app guarda um NOME; `care_items.assigned_to` espera um `uuid` de `auth.users`. Enquanto não houver conta por pessoa, guarde o nome em `next_action`/nota (ou peça uma coluna `assigned_to_name`). Mesmo caso em `care_contacts.contacted_by`.
- **prayer.title:** o card tem "Nome do pedido" (título) → coluna `title` (text, nullable) em `prayer_requests`. Migrado na Fase 2.
- **journeyStage:** o app usa códigos fixos (`first_visit, returned, connected, group, serving, leadership`); `journey_stages` guarda `name`+`position` por org → garanta as 6 linhas e mapeie código → `journey_stages.id` em `sticks.journey_stage_id`.
- **finance:** dá para gravar `category_name`/`fund_name` (texto) direto e resolver `category_id`/`fund_id` depois — as duas colunas existem.
- **groups.leader:** não é coluna de `groups`; o líder vira `group_members` com `role='leader'`.

## Tenancy e acesso
- **organizations**: id, name, currency, created_at
- **campuses**: id, org_id, name, created_at
- **profiles**: id, full_name, email, created_at
- **roles**: id, org_id, name, permissions[], is_system, created_at
- **memberships**: id, org_id, user_id, role, role_id, permissions[], is_owner, created_at

## Pessoas (uma pessoa = uma Stick)
- **sticks**: id, org_id, primary_campus_id, full_name, preferred_name, first_name, last_name, profile_photo, birth_date, gender, primary_language, email, phone, whatsapp, address_line_1, address_line_2, city, state, postal_code, country, relationship_status (enum), is_leader, first_visit_date, membership_date, conversion_date, baptism_date, assigned_pastor_id, assigned_care_leader_id, journey_stage_id, source, source_detail, tags[], preferred_contact_method, email_allowed, sms_allowed, whatsapp_allowed, last_seen_at, followup_open, archived, archive_reason, archived_at, created_at, updated_at
- **households**: id, org_id, name, campus_id, address, photo, created_at
- **household_members**: id, household_id, stick_id, relationship_type, is_primary_contact
- **journey_stages**: id, org_id, journey_id, name, position, description, color, required_milestones[], recommended_actions (jsonb), created_at
- **milestone_types**: id, org_id, code, name, is_system, auto, created_at
- **milestones**: id, org_id, stick_id, milestone_type_id, code, occurred_on, title, description, source_module, source_record_id, visibility, created_by, created_at

### Journey (Step 4 · Fase 1 — aplicado 2026-07-12, migração m13)
- **journeys**: id, org_id, name, description, is_default, created_at · uma journey padrão por org (índice único parcial `where is_default`). RLS `is_org_member`. `create_org` agora semeia 1 journey padrão + 6 estágios em orgs novas.
- **stick_journey_records**: id, org_id, stick_id, journey_id, current_stage_id, previous_stage_id, entered_stage_at, completed_stages[], notes, created_at, updated_at · UNIQUE (stick_id, journey_id). É o vínculo pessoa↔journey (posição atual, anterior, histórico). RLS `is_org_member`.

Mapa app → sticks: `relationship` → `relationship_status`; `lastSeen` → `last_seen_at`; `leader`/`isLeader` → `is_leader`; `photo` → `profile_photo`; `name` → `full_name`.

## Comunidade e presença
- **groups**: id, org_id, campus_id, name, description, meeting_day, meeting_time, archived, created_at
- **group_members**: id, group_id, stick_id, role (enum), joined_at, left_at, status
- **services**: id, org_id, campus_id, name, weekday, start_time, created_at
- **events**: id, org_id, campus_id, name, event_date, starts_at, created_at
- **attendance_sessions**: id, org_id, context_type (enum), context_id, campus_id, title, session_date, session_time, photo, created_by, created_at
- **attendance_records**: id, session_id, stick_id, status (enum), recorded_at, recorded_by, source

Mapa app → grupos: a `group` (string) de uma Stick vira relação em `group_members` (group_id + stick_id).

### Discipleship Tracks (Step 4 · Fase 5 — aplicado 2026-07-12, migração m14)
- **tracks**: id, org_id, name, description, type, status (default 'active'), created_at. RLS `is_org_member`.
- **track_steps**: id, org_id, track_id (fk tracks cascade), name, description, position (int), materials (jsonb default []), created_at. Estágios como LINHAS. RLS `is_org_member`.
- **track_enrollments**: id, org_id, track_id, stick_id (fk sticks), current_step_id (fk track_steps, on delete set null), progress (int), status (default 'in_progress'), started_at, completed_at, created_at, updated_at. UNIQUE (track_id, stick_id). RLS `is_org_member`. Conclusão cria `milestone` (code='completed_track') + `timeline_event`; Journey só se configurado (não força).

## Inteligência (Signals, Care, Timeline)
- **signals**: id, org_id, campus_id, type, category, title, description, source_module, source_record_id, related_stick_id, related_group_id, priority (enum), status (enum), assigned_to, detected_at, resolved_at, resolved_by, resolution_note, dismissed_reason, metadata (jsonb), created_at
- **signal_overrides**: id, org_id, signal_key, status, updated_at
- **care_items**: id, org_id, stick_id, signal_id, category, title, description, assigned_to, priority (enum), status (enum), due_date, confidentiality_level, next_action, created_by, created_at, resolved_at
- **care_notes**: id, care_item_id, author_id, visibility, content, created_at
- **care_contacts**: id, care_item_id, stick_id, contacted_by, contacted_on, method, note, created_at
- **timeline_events**: id, org_id, stick_id, event_type, source_module, source_record_id, title, summary, occurred_at, created_by, visibility, metadata (jsonb), created_at

Nota: Signals podem continuar calculados no client no começo (lendo os dados relacionais). Care exige permissão `care.view` no RLS. Timeline é a memória (Regra 4 do DNA: toda ação vira `timeline_events`).

## Oração e finanças
- **prayer_requests**: id, org_id, campus_id, stick_id, author_name, title, request, topics[], privacy (enum), group_id, praying_count, answered, answered_on, created_at
- **funds**: id, org_id, name, created_at
- **finance_categories**: id, org_id, type (enum), name, created_at
- **finance_entries**: id, org_id, campus_id, type (enum), description, category_id, category_name, fund_id, fund_name, amount, entry_date, created_by, created_at

Mapa app → oração: "nome do pedido" (o título) → `request` começa com o texto do pedido; o campo de título do card mapeia melhor em `metadata`/`author_name` conforme a UI atual — conferir no código antes de migrar.

## Discipleship Tracks (Step 4 · Fase 5 — aplicado 2026-07-12, migração m14)
- **tracks**: id, org_id, name, description, type, status (default 'active'), created_at. RLS `is_org_member`.
- **track_steps**: id, org_id, track_id, name, description, position, materials (jsonb), created_at. Estágios como linhas.
- **track_enrollments**: id, org_id, track_id, stick_id, current_step_id, progress, status (default 'in_progress'), started_at, completed_at, created_at, updated_at. UNIQUE (track_id, stick_id). RLS `is_org_member`.
- Conclusão (status='completed') → cria milestone + timeline_event, e move a Journey só se configurado. Sem seed no `create_org` (trilhas são conteúdo da igreja).

## Coordenação (Basecamp-lite)
- **coordination_posts**: id, org_id, campus_id, title, body, team, posted_on, created_by, created_at
- **coordination_tasks**: id, org_id, campus_id, text, assignee, done, created_by, created_at

## Ponte atual
- **app_state**: org_id, data (jsonb), updated_at, updated_by — o blob que a Fase 2 vai esvaziando entidade por entidade.

## Ordem sugerida de migração (uma por rodada de /migrate-entity)
1. `sticks` (base de tudo)
2. `groups` + `group_members`
3. `prayer_requests`
4. `finance_entries` (+ funds, categories)
5. `attendance` (sessions + records)
6. `milestones` / `journey`
7. `care` (+ notes, contacts)
8. `coordination` (posts + tasks)
9. `signals` / `timeline` (por último; dependem do resto)
