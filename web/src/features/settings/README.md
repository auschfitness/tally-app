# Feature: Configurações (/settings)

Ajustes da instituição e da conta. **A última feature** antes do cut-over. Migra do
blob para as tabelas onde há fonte relacional; o resto fica no blob com escrita
cirúrgica. Ver `docs/handoffs/settings-supabase.md`.

## Fonte da verdade por campo (decisão)
| Campo | Fonte | Ação |
|---|---|---|
| Nome da instituição | `organizations.name` (tabela) | `updateOrgAction` |
| Moeda | `organizations.currency` (tabela) | `updateOrgAction` (Finance já lê daqui) |
| Campi | `campuses` (tabela) | `addCampusAction` / `removeCampusAction` |
| Seu nome | `profiles.full_name` (tabela, linha do user) | `updateAccountAction` |
| Multi-instituição | blob `app_state.data.institution` | `setMultiInstitutionAction` (owner) |
| Idioma / Fuso | blob `app_state.data.account` | `updateAccountAction` |

## Arquivos-chave
- `domain.ts` — puro + testes: opções (CURRENCIES/LANGUAGES/TIMEZONES) + `readInstitution`/
  `readAccount` (leitura SEGURA do blob, sem assumir shape).
- `queries.ts` — `loadSettings` (cada campo da sua fonte).
- `schema.ts` / `actions.ts` — updateOrg, add/removeCampus, setMultiInstitution,
  updateAccount.
- `components/` — `SettingsView` (abas), `InstitutionPanel`, `AccountPanel`.
- Rota `/settings`.

## ⚠️ RLS e escrita
- `organizations` (SELECT/UPDATE) = **`is_org_member`** — hoje **qualquer membro** pode
  renomear a org / trocar moeda. Restringir a owner é migração de RLS do orquestrador
  (não feita aqui).
- **Blob = read-modify-write CIRÚRGICO** (`patchAppState`): lê `data`, muta só a
  sub-chave (`institution`/`account`), grava de volta preservando tudo que outras
  features guardam no `app_state`. Nunca sobrescreve o blob inteiro (o `save()` legado
  fazia isso). Seta `updated_at`/`updated_by`. Padrão de Teams/Services.
- **Remover campus**: o banco recusa se o campus estiver em uso (FK de sticks/cultos/
  eventos) — a action devolve um erro claro em vez de apagar em cascata.

## Decisões / paridade
- **Multi-instituição** só é ativável pelo **owner** (paridade com o legado; a UI
  esconde o controle para não-owner e a action revalida a permissão).
- **Tema** NÃO fica em Settings: já existe no Topbar (`ThemeToggle`). A aba Conta só
  aponta para lá (evita duas fontes do tema).
- **Categorias/fundos de finança** saíram do Settings: agora são **relacionais**
  (`finance_categories`/`funds`) e são geridos na feature **Finance** (o legado os
  guardava no blob `institution.catIn/catOut/funds`). Não duplicamos aqui.
- **Idioma/fuso** seguem no blob (i18n completo ainda não implementado) — persistidos
  para não perder a preferência; a UI ainda é PT-BR.
- **Nome do usuário** virou `profiles.full_name` (relacional), não mais o blob
  `account.name`.
