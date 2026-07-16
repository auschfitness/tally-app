# Spec de UI — correções + i18n (PT/EN/ES) + revisão ortográfica

> Orquestrador → Claude Code. Itens levantados pelo dono olhando o app novo. Tudo front-end
> (nenhuma tabela nova). Um ponto tem decisão de banco marcada abaixo (armazenar idioma).

## 1. Ortografia — corrigir e fazer varredura geral (PT-BR)
- **Bug concreto**: aparece **"0 sermães"** → o certo é **"sermões"** (plural de "sermão").
  Corrigir onde estiver (contadores, títulos, labels do Study).
- **Fazer uma varredura de ortografia em TODA a UI** (o dono pediu "revisar sempre a
  ortografia"). Conferir plurais, acentos, concordância. Respeitar o glossário fixado do
  `CLAUDE.md` (Esboço, Ideia central, Visão geral; termos de produto Stick/Signal/Care/etc.
  não traduzir; usar "Campus", não "Campi").

## 2. Dropdowns nativos — estilizar ao tema do app
- O seletor **"Todos os campus"** (e demais `<select>`) está com a **cara nativa do Windows**,
  destoando do app. O `docs/design-principles.md` GOVERNA: "controles nativos sempre
  estilizados ao tema claro E escuro".
- Padronizar **todos os `<select>`/dropdowns** para o design do Tally (mesma borda, raio,
  cor, foco, seta custom), funcionando em **tema claro E escuro**, respeitando
  `prefers-reduced-motion`. De preferência um componente único reutilizável.

## 3. Idiomas (i18n) — PT / EN / ES — SUMIRAM, reimplementar
- O seletor de idioma sumiu do app novo; **reintroduzir** em Configurações.
- Suportar **Português, Inglês e Espanhol**. PT-BR é o padrão atual.
- Implementar i18n de verdade (strings externalizadas + troca de idioma na UI). É trabalho
  grande (traduzir toda a interface) — **fatiar**: (a) infra de i18n + seletor + persistência;
  (b) traduzir por área/feature, PT→EN→ES. Não precisa sair tudo num commit.
- Manter os **termos de produto em inglês** (Stick, Signal, Care, Journey, Milestone, Pulse,
  Inbox, Finance Lite, Care Radar, Journey Map, Timeline) em qualquer idioma.

### ✅ Decisão do idioma: POR USUÁRIO — coluna já criada (orquestrador)
O dono escolheu **cada pessoa escolhe o seu idioma**. Já apliquei a migração
(`add_profiles_locale`, banco agora em **m21**):
- **`profiles.locale`** — `text NOT NULL DEFAULT 'pt-BR'`, com CHECK aceitando só
  **`'pt-BR'`, `'en'`, `'es'`**.
- **RLS**: nada a fazer — a política `prof_update` já permite o usuário editar o PRÓPRIO
  perfil (`id = auth.uid()`), então gravar o idioma funciona direto. `prof_select` deixa o
  usuário ler o seu.
➡️ Para o Claude Code: rode `generate_typescript_types` (ou peça ao orquestrador) para o
tipo de `profiles` já incluir `locale`. Leia o idioma de `profiles.locale` do usuário logado
no boot (SSR) e grave via Server Action no update do próprio perfil. Ainda assim, isole tudo
atrás de um helper `getLocale()/setLocale()` para manter as folhas limpas. Valores válidos =
os 3 do CHECK; default `pt-BR`.

## Verificação
Cada fatia com `npm run verify` verde + commit. Screenshots antes/depois nos READMEs quando
for visual (dropdown, seletor de idioma). Versione este arquivo no commit.

— fim.
