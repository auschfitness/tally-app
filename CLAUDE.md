# Tally — contexto do projeto (para o Claude Code)

Este arquivo dá ao Claude Code o contexto completo do Tally. Leia-o inteiro antes de agir. O dono do projeto (Gaybiel) é de marketing, não é dev; explique decisões técnicas em linguagem clara.

## O que é o Tally

Tally é um **Church OS**: um sistema operacional para igrejas com uma camada de inteligência pastoral. Filosofia: "um gerente vê 99%, um pastor vê o um" — ninguém deve passar despercebido. Marca em azul (#2B5CE6), tipografia Poppins, tema claro por padrão (dark mode disponível). Público: Brasil e EUA (PT/EN/ES no roadmap; hoje o app está em PT). Multi-campus e multi-instituição são requisitos de arquitetura.

Voz da interface: madura, calma, prática. Nada de linguagem religiosa artificial ("Amém! Relatório pronto!"). Prefira contexto e padrões a "scores" ("Ruth pode precisar de atenção" + o porquê, nunca "Ruth — 87% de risco").

## Estado atual do código

- **Um único arquivo `index.html`** (~120 KB): todo o HTML, CSS e JavaScript (vanilla, sem framework). Puxa Chart.js e supabase-js por CDN.
- Os **dados** ficam no **Supabase**, não no HTML. Persistência atual: um blob JSON por organização na tabela `app_state` (isolado por RLS). As tabelas relacionais completas já existem e são o alvo da migração fina.
- Autenticação: e-mail+senha (funcionando) e botão de Google (a habilitar). Onboarding cria a igreja via RPC `create_org`.
- O app é totalmente funcional como protótipo/spec viva. **Não descarte funcionalidade existente** ao refatorar.

### Primeira tarefa recomendada no Claude Code
Modularizar o `index.html` num projeto de verdade (ex.: Vite + React, ou vanilla dividido em módulos), rodando localmente e testando no navegador (coisa que o ambiente anterior não conseguia). Depois, migrar a persistência do blob `app_state` para as tabelas relacionais.

## Supabase

- Project ref / ID: `zzgxeylyrtzsqcdguxql`
- API URL: `https://zzgxeylyrtzsqcdguxql.supabase.co`
- anon key (JWT, segura no client): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z3hleWx5cnR6c3FjZGd1eHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTcyNzgsImV4cCI6MjA5OTM3MzI3OH0.Az_WOYNsX5L3qKyply5SotBVuBYten6vkN2Q4OUrFOU`
- **Nunca** exponha a service_role key no client.
- Conecte o MCP do Supabase no Claude Code: `claude mcp add --transport http supabase https://mcp.supabase.com/mcp` (e autentique).

### Modelo de dados (tabelas já criadas, RLS ativo em todas)
- Tenancy/acesso: organizations, campuses, profiles, roles, memberships
- Pessoas (Sticks): sticks, households, household_members, journey_stages, milestone_types, milestones
- Comunidade/presença: groups, group_members, services, events, attendance_sessions, attendance_records
- Inteligência: signals, care_items, care_notes, care_contacts, timeline_events
- Oração/finanças: prayer_requests, funds, finance_categories, finance_entries
- Coordenação/estado: coordination_posts, coordination_tasks, signal_overrides, app_state

### RLS
Isolamento por organização via `memberships`. Funções auxiliares (SECURITY DEFINER, sem execução para anon): `is_org_member(org)`, `has_perm(org, perm)`, `org_has_no_members`, `shares_org`. Care e orações privadas exigem permissão (`care.view`, `prayer.view_private`). Bootstrap de org via RPC `public.create_org(p_name, p_currency, p_campus, p_state jsonb)` — cria org + membership(owner) + campus + app_state atomicamente usando auth.uid().

Conceito importante: **uma pessoa = uma Stick**. Nunca crie bancos separados para visitante/membro/voluntário/criança; são relações e estágios da mesma Stick.

## Roadmap (fonte da verdade: Notion, caderno "Tally")
São 12 steps (#1 a #12) no Notion do dono. Já implementados no protótipo: #1 (arquitetura Church OS), #2 (Sticks: pessoas, households, timeline, presença, milestones), #3 (Signals, Care, Inbox). Faltam #4 a #12 (Groups/Teams, Services/Attendance, Journey completa, Giving/Finance, Kids, Study, Events, Communication, etc.). Peça ao dono para colar cada step ao implementar.

### Tally Product DNA (regras)
1. Sem módulos isolados: todo módulo se conecta a uma Stick, gera/consome Signals, aparece na Timeline, influencia a Journey.
2. Dados antes da UI: nada de gráfico falso; cada visual representa relações reais. (Hoje a tendência de presença e alguns meses de finanças ainda são ilustrativos por falta de histórico — troque por dados reais.)
3. Humano primeiro: sem score de risco/engajamento/espiritual. Use contexto, padrões, oportunidades de cuidado.
4. Toda ação cria histórico (timeline_events é a memória da igreja).
5. Construa para o pastor primeiro: "se um pastor abrir esta página na segunda de manhã, ela o ajuda a entender a igreja?".

## Deploy
Recomendado: repositório no GitHub ligado ao Vercel (auto-deploy a cada push). O app é estático (index.html). Após o deploy, adicione a URL do Vercel em Supabase → Authentication → URL Configuration (Site URL + Redirect URLs) — necessário para o Google OAuth. "Confirm email" está desligado (login por e-mail+senha entra na hora).

## Convenções
- Preserve o sistema visual atual (claro, interativo, gráficos clicáveis, drill-down, densidade organizada).
- Termos de produto (não traduzir): Stick(s), Signal, Care, Journey, Milestone, Pulse, Inbox. Rótulo do botão de adicionar pessoa: "Nova pessoa". Use "Campus" (não "Campi").
- Rode/teste no navegador antes de dar por pronto. Valide antes de fazer deploy.

## Arquivos entregues junto
- `index.html` — o app atual (conectado ao Supabase).
- `vercel.json` — config de deploy.
- `Tally-Supabase-Guia.md` — detalhes de integração e RLS.
- `Tally-Relatorio-Noite.md` — histórico do que foi feito.
- Marca: `Tally-Logo-*.svg/eps/pdf/png`, `Tally-IDV-Apresentacao.pdf`, `Tally-Fundacao-Marca-Produto.html`.
