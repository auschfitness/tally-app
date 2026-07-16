# i18n — PT-BR / EN / ES (idioma por usuário)

Infra de internacionalização do Tally. **Idioma é POR USUÁRIO**, na coluna
`profiles.locale` (CHECK aceita só `pt-BR` | `en` | `es`; default `pt-BR`; RLS
`prof_update` já permite o self-update). Ver `docs/handoffs/ui-fixes-i18n.md`.

## Peças
- `config.ts` — `Locale`, `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_LABELS`, `isLocale`,
  `normalizeLocale`. Puro, client-safe.
- `locale.ts` — **`getLocale()`** (SSR): lê `profiles.locale` do usuário logado. Sem
  sessão / erro → default. Nenhuma folha lê a coluna direto — só este helper.
- `actions.ts` — **`setLocaleAction(locale)`** (Server Action): grava em
  `profiles.locale` (linha do próprio user) e revalida o layout inteiro.
- `dictionaries/{pt-BR,en,es}.ts` + `dictionaries.ts` — `pt-BR` é a FONTE; o tipo
  `Dictionary` é derivado dela (sem `as const` → valores são `string`), então en/es
  **precisam ter as mesmas chaves** (o typecheck cobra completude). `getDictionary(locale)`.
- `LocaleSelect.tsx` (Client) — seletor que persiste na hora (onChange →
  `setLocaleAction` → `router.refresh()`), usando o `<Select>` padronizado.
- `index.ts` — barrel só do que é client-safe (config + dicionários). `getLocale`/
  `setLocaleAction` importam-se direto dos seus arquivos (server-only).

## Fluxo (SSR)
`page/layout` → `getLocale()` → `getDictionary(locale)` → passa as strings prontas às
folhas (Client Components recebem `dict` por prop; não importam dicionário).

## Estado atual (fatia 3a — infra + seletor + persistência)
- Seletor de idioma reintroduzido em **Configurações → Conta** (persiste em
  `profiles.locale`; substituiu o antigo campo no blob `app_state.data.account.language`).
- Traduzido como PROVA do pipe: o **chrome de Configurações** (título, subtítulo, abas)
  e toda a **aba Conta** (PT/EN/ES). O resto do app segue em PT-BR até a fatia 3b.

## Como traduzir mais (fatia 3b) — por feature
1. Acrescente as chaves no `dictionaries/pt-BR.ts` (namespace por área, ex.: `nav`,
   `care`, `home`…). O typecheck vai exigir as mesmas chaves em `en.ts` e `es.ts`.
2. Na `page`/`layout` da feature: `const dict = getDictionary(await getLocale())` e
   passe `dict.<area>` às folhas (client) por prop.
3. Troque as strings hardcoded pelas do dicionário.
4. **NÃO traduza os termos de produto** (Stick, Signal, Care, Journey, Milestone,
   Pulse, Inbox, Finance Lite, Care Radar, Journey Map, Timeline) — ficam em inglês em
   qualquer idioma.
