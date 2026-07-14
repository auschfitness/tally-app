# Refatoração para Next.js + TypeScript + Supabase — PLAYBOOK OFICIAL

Origem: documento do dev consultor do dono. Este é o contrato da migração. Segui-lo à risca.
Atue como engenheiro sênior de Next.js/React/TypeScript/Supabase.

## Regras de execução do Tally (acordadas com o orquestrador)
- **Trabalhar numa BRANCH** (`refactor/nextjs`), NÃO na main. A app JS puro atual continua no ar até a versão Next atingir paridade. Cut-over só no fim.
- **Banco = orquestrador (Cowork).** NÃO recriar banco, NÃO alterar schema/RLS sem necessidade comprovada e documentada. Os tipos do Supabase são gerados/fornecidos pelo orquestrador.
- **Verificação**: typecheck + lint + build + testes dos fluxos críticos (substitui o teste de paridade do monólito).
- Preservar `docs/design-principles.md` como norte visual.

## Objetivo
Refatorar integralmente o projeto (hoje JS puro + Supabase) para Next.js + TypeScript, **sem alterar o comportamento das funcionalidades**. Preservar: todas as features, regras de negócio, fluxos de auth/autorização, integração Supabase, comportamento visual e UX (salvo ajustes estritamente necessários). Tornar o código modular, tipado, seguro, testável.

Prioridade absoluta, nesta ordem: 1) preservação das funcionalidades; 2) segurança dos dados; 3) correção da arquitetura; 4) manutenibilidade; 5) performance; 6) melhorias visuais só quando necessárias.

Não reescrever por suposição — entender como a app atual funciona antes de mudar.

## Paridade funcional (regra fundamental)
Não pode alterar em silêncio: regras de negócio, campos de formulário, validações, permissões, fluxos de auth, redirecionamentos, consultas ao Supabase, CRUD, estrutura dos dados persistidos, filtros/pesquisas, mensagens relevantes, integrações, premissas de segurança.
Se achar um bug no sistema atual, NÃO corrigir em silêncio: registrar (comportamento atual, problema, impacto, correção recomendada). Preservar o comportamento atual, exceto quando impedir tecnicamente a migração, causar vulnerabilidade grave ou estiver inequivocamente quebrado — aí aplicar a menor correção e documentar.

## Fase 1 — Auditoria obrigatória (antes de mudar qualquer arquivo)
Produzir inventário: todas as páginas/telas, formulários, ações do usuário, fluxos de navegação e de auth, operações Supabase, recursos realtime, dependências de APIs externas, comportamentos dependentes do navegador, regras de negócio, estados globais/locais, estáticos/estilos/scripts.
Mapear Supabase: init do cliente, tabelas, views/RPCs, buckets Storage, eventos Realtime, operações de auth, leituras, inserts, updates, deletes, relacionamentos, campos por feature, tratamento de erro, env vars, dependência de RLS, uso de chaves.
Mapear código atual: duplicação, funções gigantes, manipulação de DOM, variáveis globais, localStorage/sessionStorage, listeners manuais, HTML por concatenação, regra de negócio na UI, consultas duplicadas, dependências circulares, código morto, falhas de segurança, pontos de risco de perda de comportamento.
Criar **matriz de migração**: Funcionalidade atual | Arquivos atuais | Dependências | Destino no Next.js | Estratégia | Riscos.
Depois criar plano por etapas. NÃO parar no plano — executar depois.

## Stack obrigatória
Next.js (versão estável) com **App Router**; React; **TypeScript estrito**; Supabase; `@supabase/supabase-js`; `@supabase/ssr` (auth SSR); ESLint; validação tipada; env vars corretas; o gerenciador de pacotes já usado (preservar lockfile quando possível).
NÃO introduzir Prisma/ORM/Redux/bibliotecas grandes sem necessidade técnica real. NÃO trocar o Supabase. Ao adicionar dependência, justificar (por que, onde, por que a nativa não basta).

## Arquitetura (App Router) — referência, criar só o que tem uso real
```
src/
  app/ (public)/ (auth)/ (dashboard)/ api/ layout.tsx loading.tsx error.tsx not-found.tsx
  components/ ui/ shared/
  features/<feature>/ components/ actions/ queries/ services/ schemas/ types/ utils/
  lib/ supabase/{client,server,session}.ts  env/ errors/ utils/
  hooks/  types/  config/
```
Organizar por **funcionalidade e responsabilidade**, não só por tipo técnico. Evitar arquivos gigantes E fragmentação excessiva.

## Isolamento por feature (objetivo de 1ª classe: editável por IA em isolamento)
Requisito do dono: cada seção do app (pastor, sermão, finance, etc.) precisa poder ser **entendida e alterada lendo SÓ a pasta daquela feature** — sem uma IA precisar ler o app inteiro (economia de tokens e de risco). Fatias verticais, não organização por tipo técnico.
Regras:
- **Colocação total por feature**: `features/<feature>/` contém tudo daquela seção — components, actions, queries, services, schemas, types, utils E **estilos** (CSS Modules colocados por componente). PROIBIDO um `styles.css` global gigante como hoje; o global fica só para tokens/reset/design-system.
- **Superfície compartilhada pequena e estável**: design-system (`components/ui`), cliente Supabase, tipos do banco, utils. Uma feature depende disso e quase nunca precisa entender o interior de OUTRA feature.
- **Mapa por feature**: cada `features/<feature>/` tem um `README.md` curto (o que a seção faz, arquivos-chave, tabelas do Supabase que usa, rotas, e o que importa do compartilhado). Serve pra uma IA se orientar com uma leitura barata e ir direto ao ponto.
- **Acoplamento global mínimo**: sem estado global espalhado; conexões entre features (o DNA do Tally: Study↔Journey, etc.) acontecem por **interfaces limpas** (tipos compartilhados, ids, signals/eventos), não por código emaranhado. Conectadas, mas não coladas.
- **Teste do objetivo**: "pra trocar a seção X, preciso abrir só `features/X/` + o design-system + os tipos do banco?" Se não, o acoplamento está errado.

## Server vs Client Components
Server Components são o PADRÃO (buscar dados iniciais, dados privados, páginas protegidas, ler do Supabase, lógica sem navegador, reduzir JS no cliente, manter código sensível no servidor).
`"use client"` só quando precisar de: estado/hooks, eventos do navegador, useEffect, window/document/localStorage/navigator, libs de DOM, Realtime, interações não resolvíveis no servidor. Manter Client Components pequenos e nas folhas. Passar dados serializáveis do server pro client. NÃO marcar layouts/páginas inteiras como client por conveniência.

## Renderização e dados
Escolher conscientemente dinâmico/estático/cacheado. Dados autenticados/privados: sem cache compartilhado que misture usuários; respeitar sessão; render dinâmico quando preciso. Dados públicos pouco mutáveis: cache/revalidação quando útil. Após mutações: revalidar/invalidar dados afetados; não recarregar a app inteira. NÃO fazer Server Component chamar Route Handler da própria app pra regra interna — extrair pra serviço/função e chamar direto no servidor.

## Server Actions (mutações internas da própria UI)
Criar/editar/excluir, envio de forms, mudança de status, associação de entidades, operações autenticadas iniciadas pela app. Cada action: 1) valida os dados; 2) obtém e valida a sessão no servidor; 3) verifica autorização; 4) executa no Supabase; 5) trata erros; 6) retorna resultado tipado; 7) revalida dados quando preciso.
NÃO confiar em dados do navegador (user id, org id, papel, permissões, valores calculados, status admin) — derivar/validar no servidor.
Padrão de retorno:
```ts
type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };
```

## Route Handlers (só necessidade HTTP real)
Webhooks, integrações externas, APIs consumidas por outros sistemas, uploads com endpoint específico, callbacks de auth, endpoints públicos/versionados. NÃO criar API interna só pra ser chamada pelos próprios Server Components. Validar auth/autorização/payload/origem; usar códigos HTTP corretos.

## Supabase
Preservar projeto e banco existentes. Clientes SEPARADOS: navegador, servidor, e camada de sessão (padrão @supabase/ssr). Cliente do navegador só onde há necessidade real; cliente do servidor para Server Components/Actions/Route Handlers, validação de sessão, consultas privadas, operações sensíveis.

### Autenticação
Migrar pro padrão SSR do Supabase com **cookies** (não depender só de localStorage). Garantir: sessão no server-render, páginas protegidas validadas no servidor, redirect de não-autenticado, logout invalida sessão, renovação de sessão, redirect pós-login, sem inconsistência server/cliente. **Token no navegador nunca é autorização suficiente.**

### Chaves
Publishable/anon key pode ir no cliente (padrão Supabase). service_role: NUNCA no navegador, nunca com prefixo público, nunca importada por Client Component, só no servidor, só quando necessária.

### Consultas
Centralizar por domínio/feature (não blocos gigantes de query em componentes). Consultas: selecionar só campos necessários, tratar ausência/erros, tipadas, evitar N+1 e queries em loop, paginação em listas grandes, preservar filtros/ordenação atuais. NÃO criar repositório genérico que esconde tudo — serviços focados nas operações reais.

### RLS e multi-tenant (crítico)
RLS é parte essencial da segurança; filtro no front (`.eq("org_id", ...)`) é necessário pra query mas NÃO substitui RLS. NÃO desativar RLS pra facilitar; NÃO alterar políticas sem documentar.
Isolamento entre organizações: usuário não acessa dados de outra org; org id não aceito cegamente do navegador; associação usuário↔org validada no servidor; funções admin validam papel; mutações validam o tenant; rotas/params/forms não permitem troca arbitrária de tenant. (O Tally já tem multi-tenant por `memberships`/RLS — preservar e fortalecer, não redesenhar.)

## TypeScript (estrito)
Sem `any` (salvo integração externa inevitável e justificada); sem cast forçado só pra calar o compilador; sem `@ts-ignore` sem justificativa. Tipar params/retornos/estruturas, resultados de actions, props, eventos; tratar null/undefined; usar unions/discriminated unions; preferir union literal a enum quando mais simples; evitar duplicação de tipos.
Gerar os tipos do banco (fornecidos pelo orquestrador). Distinguir: tipos do banco, entrada de formulário, modelos de domínio, view models, resultados de ações, respostas externas. Mapear explicitamente quando persistência ≠ domínio.

## Validação / Erros
Validar em TODA fronteira: Server Actions, Route Handlers, params de rota, query strings, forms, dados externos, uploads, env vars. Schemas tipados e reutilizáveis. Validação do navegador melhora UX mas não substitui a do servidor. Retornar erros de campo estruturados.
Tratar erros consistentemente, diferenciando validação/auth/autorização/not-found/conflito/falha Supabase/externa/inesperado. NÃO expor stack trace, SQL, tokens, chaves, internals. Mensagens amigáveis; detalhe técnico só no log do servidor. Usar error.tsx/loading.tsx/not-found do App Router. Sem try/catch vazio.

## Interface / estilos
Preservar design e comportamento visual atuais. NÃO trocar por outro design system sem pedido. Reutilizar o CSS existente de forma saudável (organizar, remover duplicação, CSS Modules quando fizer sentido). NÃO migrar tudo pra Tailwind se o projeto não usa. Componentes: reutilizáveis quando há repetição real, props tipadas, sem regra de negócio, acessíveis, mobile, sem erro de hidratação. Usar recursos do Next (imagem, fonte, navegação, metadata) quando trouxer benefício sem mudar funcionamento.

## Estado
Mais perto possível de quem usa. Prioridade: 1) estado derivado do servidor; 2) estado local; 3) params de URL (filtros/paginação/busca compartilhável); 4) Context só pra global pouco mutável; 5) lib externa só com necessidade comprovada. Não duplicar no cliente o que o servidor já dá. localStorage só pra preferências locais (tema); nunca tokens/permissões/dados sensíveis.

## Realtime / Performance / Segurança
Realtime só onde já é necessário; subscription em Client Component, escopo claro, cleanup correto, sem duplicar, respeitando RLS.
Performance: Server Components padrão, Client pequenos, paginação, só colunas necessárias, loading states, streaming quando útil, sem requests duplicados/cascata, lazy em componentes pesados, otimização de imagem, revalidação pós-mutação, debounce em busca. Sem otimização prematura.
Segurança: nunca confiar na UI pra autorização (esconder botão ≠ impedir operação); toda operação sensível revalidada no servidor e protegida no banco.

## Env vars
`.env.example` sem segredos; centralizar e validar; diferenciar públicas/servidor/chaves Supabase/URLs/opcionais; não commitar `.env` real; sem segredo no código; módulos do navegador não acessam env exclusivas do servidor.

## Estratégia de migração (incremental)
- **Fase 1 Compreensão**: auditar, mapear features e Supabase, riscos, matriz.
- **Fase 2 Fundação**: configurar Next, TS estrito, ESLint, estrutura, env, clientes Supabase (server/browser), auth SSR, layouts e rotas principais.
- **Fase 3 Componentes compartilhados**: estrutura visual, navegação, componentes reusados, estilos, responsividade.
- **Fase 4 Migração por feature** (uma completa por vez): página, componentes, tipos, validação, queries, mutations, autorização, tratamento de erro, testes. Só "migrada" quando operacional ponta a ponta.
- **Fase 5 Validação**: comparar com o comportamento anterior, testes, lint, typecheck, build de produção, corrigir hidratação/imports, verificar segurança.
- **Fase 6 Limpeza** (só após confirmar equivalência): remover legado/código morto/dependências antigas, consolidar duplicação, atualizar docs. NÃO excluir a implementação antiga antes de ter equivalente funcional.

## Proibições
Não alterar funcionalidade sem documentar; não redesenhar UI arbitrariamente; não trocar Supabase; não recriar banco; não desativar RLS; não expor chave privada; não usar service_role no navegador; não virar tudo Client Component; não usar `"use client"` por padrão; não abusar de `any`/`@ts-ignore`; não duplicar regra de negócio cliente/servidor sem necessidade; não criar API interna desnecessária; Server Component não chama a própria API; não guardar auth sensível em localStorage; não adicionar dependência sem necessidade; não criar abstração sem uso; não remover arquivo antes de validar o substituto; não parar só no plano; não declarar concluído com erro de build/tipo/lint; não esconder feature que não conseguiu migrar.

## Critérios de aceite (resumo)
Todas as features disponíveis; Next.js App Router; TS estrito; auth SSR por cookies; páginas privadas protegidas no servidor; Server Components padrão e Client só quando preciso; mutações via Server Actions; Route Handlers só p/ HTTP real; código organizado por feature; entidades tipadas; entrada validada no servidor; erros tratados; segredos protegidos; RLS habilitado; isolamento entre orgs preservado; typecheck + lint + build passam; fluxos principais testados; docs atualizadas; legado removido só após validação; qualquer mudança de comportamento documentada.

## Entregáveis finais
1) Resumo da arquitetura; 2) inventário de features (migrada? validada?); 3) arquivos principais (criados/alterados/removidos); 4) alterações de comportamento (ou "nenhuma intencional"); 5) decisões técnicas; 6) problemas (corrigidos p/ migrar / mantidos p/ preservar / melhorias futuras); 7) banco (mudou schema/índices/funções/triggers/RLS/Storage? — mudanças destrutivas não são automáticas; migration só se necessária, com impacto explicado); 8) resultados de typecheck/lint/test/build (executados de verdade); 9) roteiro de teste manual; 10) README atualizado (requisitos, instalação, env, execução, build, testes, Supabase, deploy).

## Forma de trabalho
Trabalhar direto no projeto (na branch). Antes de cada grande mudança: analisar o atual, determinar o comportamento a preservar, implementar o equivalente em Next, validar, só então remover o antigo. Não pedir aprovação entre cada fase, salvo bloqueio real. Em ambiguidade: código atual é a fonte da verdade; preservar o observado; registrar a suposição; escolher a menor mudança funcional. Implementar de verdade nos arquivos, não pseudocódigo, até migrar tudo ou achar bloqueio técnico real.
