# Tally — app (Church OS)

App do Tally, um **Church OS** com camada de inteligência pastoral. JavaScript
vanilla organizado em módulos ES, empacotado com **Vite**. Os dados ficam no
**Supabase** (login por e-mail+senha, onboarding via RPC `create_org`,
persistência na tabela `app_state`).

> Contexto completo do produto, arquitetura e roadmap: veja [`CLAUDE.md`](./CLAUDE.md).

## Rodar localmente

Precisa de **Node 18+** (testado no Node 24).

```bash
npm install      # instala as dependências (uma vez)
npm run dev      # sobe o servidor de desenvolvimento em http://localhost:5173
```

Outros comandos:

```bash
npm run build    # gera a pasta dist/ (o site pronto para publicar)
npm run preview  # serve a dist/ localmente, para conferir o build
npm test         # teste de paridade: compara cada tela do código modular com o original
```

### Preview sem login (desenvolvimento)

Em `npm run dev`, o console do navegador expõe `__tallyPreview('<tela>')`, que
renderiza qualquer tela com dados de exemplo (a org demo "Grace Church"), sem
precisar logar. Ex.: `__tallyPreview('finance')`, `__tallyPreview('prayer')`.
Isso **não** vai para o build de produção.

## Estrutura

```
index.html            Casca da página (só o esqueleto + <script> do módulo)
src/
  main.js             Ponto de entrada: tema, listeners globais, início do app
  config.js           URL + chave pública (anon) do Supabase
  styles.css          Todo o CSS
  core/
    state.js          Estado da aplicação (dados das telas)
    session.js        Sessão: cliente Supabase, org e usuário logado
    persist.js        save() — grava o estado no Supabase (com debounce)
    supabase.js       Cliente, login/cadastro/Google, onboarding, carregar org
    theme.js          Tema claro/escuro
    helpers.js        Utilidades puras (datas, texto, rótulos)
    format.js         Formatação de dinheiro
    derived.js        Inteligência: careReasons, Signals, saúde de grupos, timeline…
    render.js         Render central (injeta a tela no #content)
    events.js         Navegação e listeners globais
  ui/
    modal.js          Janelas modais
    charts.js         Gráficos (Chart.js)
  views/              Uma tela por arquivo
    home.js  inbox.js  sticks.js  care.js  journey.js
    groups.js  coordination.js  prayer.js  finance.js  settings.js
  dev/
    seed.js           Dados de exemplo (só para dev/testes)
test/
  compare.mjs         Verificação de paridade (modular × original)
reference/
  original-monolith.html   O index.html original de 1 arquivo (referência/base do teste)
```

## Bibliotecas

- [`chart.js`](https://www.chartjs.org/) — gráficos
- [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) — banco e autenticação

Antes ficavam via CDN; agora vêm via npm (versões travadas, build otimizado).

## Deploy (Vercel)

O app é estático. O fluxo recomendado é **GitHub + Vercel** (publica sozinho a
cada `git push`):

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, importe o repositório. Ela detecta o Vite automaticamente
   (build: `vite build`, saída: `dist`).
3. Depois do primeiro deploy, copie a URL da Vercel e cole no Supabase em
   **Authentication → URL Configuration** (Site URL + Redirect URLs). Isso é
   necessário para os redirects de autenticação e para o Google OAuth.

## Segurança

A chave em `src/config.js` é a **anon key** do Supabase — pública por design e
protegida pelo RLS (Row Level Security). Pode ir para o GitHub sem risco. A
`service_role` key **nunca** deve aparecer no front-end.
