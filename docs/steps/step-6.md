# TALLY — STEP 6 · SERVIÇOS, EVENTOS, CALENDÁRIO & OPERAÇÕES DE CULTO (spec + plano autônomo)

Fonte: Notion "Tally" › #6. Construir SOBRE o app existente. Camada operacional dos encontros da igreja.
O culto é onde muitos sistemas do Tally convergem: presença, visitantes, voluntários, times, sermões, oração, kids, Journey, Signals, follow-up. Um Serviço não é só um evento — é um momento da igreja que gera dados e interações humanas.

## Conceitos
- **Service** (culto recorrente): Domingo 9h, Quarta de oração, Culto de jovens. Recorrente. Pertence a igreja/campus/local/horário.
- **Event** (evento especial): conferência, retiro, seminário, missão, curso. NÃO fundir com Service — precisam operacionais diferentes, mas ambos geram presença e Signals.
- Uma ocorrência de culto = uma `attendance_sessions` com context_type='service' (já existe da Fase 2/Step 4).

## SCHEMA — JÁ APLICADO pelo orquestrador (m20). NÃO tocar no banco.
Reaproveita tabelas existentes; estendi duas e criei duas. Tudo RLS `is_org_member`.
- **services** (estendida): já tinha id, org_id, campus_id, name, weekday, start_time, created_at. + description, type, recurring_pattern (weekly/monthly/custom), location, end_time, active.
- **events** (estendida): já tinha id, org_id, campus_id, name, event_date, starts_at, created_at. + description, type, cover_image, end_time, location, capacity, registration_required, payment_required, check_in_enabled, status, created_by.
- **service_plan_items** (novo — order of service): id, org_id, service_id (fk services), session_id (fk attendance_sessions), position, time_label, title, duration_min, responsible, notes, created_at.
- **event_registrations** (novo — inscrições, gestão INTERNA): id, org_id, event_id (fk events), stick_id, name, email, phone, household, answers (jsonb), payment_status, checked_in, checked_in_at, created_at.
- Ganchos que já existem: `sermons.service_id` (sermão num culto — Study), `schedule_assignments.service_id/event_id` (escala do Step 7), `attendance_sessions`/`attendance_records` (presença).

## ADIADO de propósito (NÃO fazer no lote autônomo)
- **Página pública de inscrição (anon)** e **pagamento**: exigem acesso anônimo + fluxo de pagamento, sensível a segurança. Fazer em rodada dedicada com o dono. No lote, inscrição/check-in é **gestão interna** (staff logado registra/marca presença).
- Se precisar de acesso anon/tabela nova pra isso, PARE e escreva BLOCKED.md.

## FASES (ordem do doc §21). Schema pronto; front por fase.
- **Fase 1**: Service como entidade + cultos recorrentes + conectar presença. Módulo/nav "Cultos" (ou dentro de um módulo de operações), CRUD de services, ligar às `attendance_sessions`.
- **Fase 2**: detalhe do serviço + dashboard (tendência de presença últimas ~12 sessões, adultos/kids/visitantes/retornantes; ordem do culto via service_plan_items).
- **Fase 3**: conectar sermões do Study (sermons.service_id) + placeholders de Teams (schedule_assignments já liga times à escala do serviço).
- **Fase 4**: Events (CRUD com os campos novos) + inscrição/check-in INTERNOS (event_registrations) + identificar visitante (1ª vez/retornante/Stick conhecido; não duplicar Stick).
- **Fase 5**: Calendário unificado (services + events + groups + o que existir), views mês/semana/agenda, filtros por campus/ministério/tipo.
- **Fase 6**: Service Signals (§10: follow-up de visitante caiu, presença caiu 20%, cobertura de time incompleta; celebrações) → Inbox/Home. Conectar visitante→Journey, resposta→Milestone.

## AUTONOMIA (igual aos lotes anteriores)
Ordem 1→6; comitar cada fase (`feat(step6-faseN): ...`); /verify-app verde + verificação no navegador; validação MCP nas tabelas tocadas; NÃO tocar no banco (schema pronto; falta algo → BLOCKED.md); dúvida menor → padrão seguro + anota no report; DNA + RLS + PT-BR (termos de produto protegidos em inglês). Telas novas → smoke. Ao fim, `.tmp/step-6-DONE.md`.

## DNA específico
- Serviço/evento geram presença, visitantes viram oportunidade de Journey, respostas viram Milestone/Care. Não é ilha: alimenta Home, Inbox, Timeline.
- Visual operacional, não planilha: timeline/checklists/gráficos de presença/prontidão de time. Evitar tabelão e calendário genérico sem alma.
- Multi-campus: serviços são campus-aware.
