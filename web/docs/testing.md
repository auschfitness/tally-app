# Testes — Tally (Next.js)

A verificação por marco é **typecheck + lint + test + build** (`npm run verify`).
Os testes têm três camadas, do mais barato/determinístico ao mais caro:

## 1. Unidade (roda sempre, offline) — `npm run test`
Regras de domínio puras portadas do app legado (a maior fonte de risco de paridade).
Arquivos `src/**/*.test.ts`. Ex.: `features/sticks/domain.test.ts` (careReasons, jornada,
rótulos), `features/sticks/schema.test.ts` (validação de entrada). Sem rede, sem fixture.

## 2. Integração (auto-pula sem fixture) — camada de dados
Prova que queries/actions respeitam **org-scoping/RLS** e o **shape** dos dados, com uma
**sessão de usuário de teste real**. Arquivos `*.integration.test.ts`, usam
`@/test-support/supabase` (`describe.skipIf(!hasTestFixture)`).

**Contrato da fixture (provido pelo orquestrador / Cowork):** um usuário de teste e uma
org de teste semeada (dados reais atrás de login). Configurar no ambiente de teste:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
TALLY_TEST_EMAIL=...
TALLY_TEST_PASSWORD=...
```

Com essas variáveis, `npm run test` passa a rodar também os testes de integração
(login → query → asserção de org-scoping e shape). Sem elas, pulam sem falhar.

## 3. E2E leve (SSR + auth) — só fluxos críticos [a fazer na validação]
Playwright, só o crítico: **login → página protegida renderiza dados semeados**;
**logout**; **redirect de não-autenticado → /login**. Instalar na fase de validação
(baixa navegadores) usando a mesma fixture do orquestrador + o preview deploy da branch.
Não e2e em tudo — só o caminho que prova SSR autenticado ponta a ponta.

## Divisão de validação (acordada com o orquestrador)
- **Claude Code:** unidade (parity das regras) + integração (org-scoping/RLS/shape) +
  e2e leve dos fluxos críticos.
- **Orquestrador:** valida o lado do banco via MCP e fornece a fixture (usuário+org de teste).
- **Dono:** confere no preview deploy da branch.
