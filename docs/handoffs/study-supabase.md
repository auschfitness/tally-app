# Handoff Supabase — feature Study / Sermões (/study)

> Escrito pelo orquestrador (dono do Supabase) para o Claude Code (dono do front).
> Fatos **confirmados via MCP** em `zzgxeylyrtzsqcdguxql`, 2026-07-14.
> **Nenhuma migração necessária.** Última migração: **m20**. Trilhas (`tracks*`) é feature
> SEPARADA — handoff próprio depois.

## TL;DR
- 4 tabelas: `sermons` (o sermão + canvas), `sermon_scriptures` (passagens),
  `series` (séries), `study_notes` (notas de estudo).
- Todas com `org_id` + RLS `is_org_member(org_id)` (USING + WITH CHECK).
- É a maior feature (editor canvas, autosave, API externa helloao, glossário PT-BR).
  Sugiro **fatiar**: (1) sermões CRUD + editor de `content`; (2) passagens; (3) séries;
  (4) notas de estudo. Cada fatia com verify verde antes da próxima.

## ⚠️ Alerta de RLS — `visibility` NÃO é imposta pelo banco
`sermons.visibility` é um enum (`private | leadership | church | public`), MAS a RLS só
filtra por `is_org_member(org_id)`. **Qualquer membro da org lê TODOS os sermões**,
independente da visibilidade. Ou seja, hoje `visibility` é **rótulo de app**, não uma
regra de acesso. Se "private" deve realmente esconder o sermão de outros da equipe,
isso **não existe no banco ainda** — seria uma migração de RLS por visibilidade que **eu**
faria. Por ora: trate `visibility` como metadado de exibição e **não** confie nele como
segurança. (Difere de Care/orações privadas, que TÊM permissão real.)

## Enums (valores EXATOS — enums Postgres)
- `sermon_status`: **draft, preparing, ready, preached, archived**
- `sermon_visibility`: **private, leadership, church, public**
- `series_status`: **planning, active, completed, archived**

## Colunas reais

**sermons**: `id` · `org_id` NOT NULL · `title` NOT NULL · `subtitle` null ·
`description` null · `preacher_id` uuid null · `series_id` uuid null · `campus_id` uuid null ·
`service_id` uuid null · `sermon_date` date null · `status` enum NOT NULL ·
`visibility` enum NOT NULL · `main_passage` text null (passagem principal) ·
`big_idea` text null (**= "Ideia central"** no glossário) ·
`content` **jsonb NOT NULL** (o canvas: Esboço/Notas/Ilustrações/Aplicação/Resposta de
oração) · `created_at` · `updated_at`.

**sermon_scriptures**: `id` · `org_id` NOT NULL · `sermon_id` uuid NOT NULL ·
`book` text NOT NULL · `chapter` int NOT NULL · `verse_start` int null · `verse_end` int null ·
`reference` text NOT NULL · `created_at`.

**series**: `id` · `org_id` NOT NULL · `title` NOT NULL · `description` null · `theme` null ·
`cover_image` null · `start_date` date null · `end_date` date null · `status` enum NOT NULL ·
`created_at`.

**study_notes**: `id` · `org_id` NOT NULL · `author_id` uuid null · `title` text null ·
`content` **text** null · `scope` text NOT NULL · `sermon_id` uuid null · `series_id` uuid null ·
`scripture_ref` text null · `topic` text null · `tags` **text[] NOT NULL** (default `{}`) ·
`created_at` · `updated_at`.

## Editor / autosave (`sermons.content`)
- `content` é **jsonb NOT NULL** — o shape é **do app** (as seções do canvas). Preserve
  1:1 o formato que o legado grava; não reformate no banco. Novo sermão: inserir com um
  `content` válido (ex.: `{}` ou a estrutura de seções vazia), nunca null.
- Autosave = `update sermons set content=..., updated_at=now() where id=...`. É um update
  de uma linha só — sem problema de performance. Setar `updated_at` na action (não confie
  em trigger).

## Constraints e cascades
- `sermon_scriptures` tem **UNIQUE (sermon_id, reference)** → pode usar
  `upsert onConflict:'sermon_id,reference'` para as passagens (sem duplicar a mesma ref).
- **Apagar sermão → CASCADE** em `sermon_scriptures`; `study_notes.sermon_id` → **SET NULL**
  (a nota sobrevive, desassociada).
- **Apagar série → SET NULL** em `sermons.series_id` e `study_notes.series_id` (não apaga
  sermões/notas). `sermons.campus_id` → SET NULL.

## ⚠️ Sem FK em `sermons.service_id` e `sermons.preacher_id`
Essas duas colunas são uuids **sem** foreign key (confirmado). O banco **não** garante
integridade nem faz SET NULL automático se o service/stick for apagado — pode sobrar uuid
órfão. Ao hidratar, resolva defensivamente (pode não achar o alvo) e não conte com cascade.
`preacher_id` provavelmente aponta para `sticks`, mas sem FK. Se quiser que eu adicione as
FKs (com o ON DELETE certo), me peça — é migração minha.

## Lembretes de produto (CLAUDE.md — glossário fixado)
`big_idea` = **Ideia central**; Outline = **Esboço**; seções: Esboço, Notas, Ilustrações,
Aplicação, Resposta de oração; exemplos de passagem em PT ("João 10:1-18"). API externa
helloao e interlinear são camada de app (interlinear grego/hebraico segue ADIADO).

## Sticks arquivadas
`sticks.archived` existe; tipo migrado não o carrega → filtrar na query onde listar pessoas.

## Depois de Sermões
**Study/Trilhas** (`tracks`, `track_steps`, `track_enrollments`, `milestones`) — handoff
próprio; me peça o escaneamento quando chegar.

— fim. Dúvidas de banco: perguntar ao orquestrador, não improvisar schema.
