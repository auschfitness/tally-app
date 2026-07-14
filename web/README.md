# Tally — web (Next.js)

Refatoração do Tally (Church OS) para **Next.js (App Router) + TypeScript estrito +
Supabase (SSR por cookies)**. Vive em `tally-app/web/` e é construído em paralelo ao app
JS puro legado (`tally-app/`), que segue no ar até o cut-over. Esta pasta é a fonte da
verdade da versão Next.

> Contrato da migração: [`docs/refactor-nextjs-spec.md`](./docs/refactor-nextjs-spec.md).
> Auditoria e matriz: [`docs/audit.md`](./docs/audit.md) ·
> [`docs/migration-matrix.md`](./docs/migration-matrix.md).
> Norte de UI: [`docs/design-principles.md`](./docs/design-principles.md).

## Requisitos
- Node 18+ (testado no Node 24).
- Um projeto Supabase (o schema/RLS é preservado, gerido pelo orquestrador).

## Instalação e execução
```bash
cp .env.example .env.local   # preencha a URL e a anon key públicas do Supabase
npm install
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente
Só chaves **públicas** (a segurança está no RLS). Ver [`.env.example`](./.env.example):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

A `service_role` **nunca** entra aqui nem em qualquer `NEXT_PUBLIC_*`.

## Verificação (substitui o teste de paridade do monólito)
```bash
npm run typecheck   # tsc --noEmit (TypeScript estrito)
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm run build       # build de produção
npm run verify      # os três em sequência
```

## Arquitetura
App Router com fatias verticais por feature (spec §Isolamento por feature):
```
src/
  app/
    (auth)/login        Login (Server Action e-mail+senha; Google OAuth no cliente)
    (auth)/auth/callback Troca de code→sessão (OAuth / confirmação de e-mail)
    onboarding          Criação da igreja (RPC create_org)
    (dashboard)/        Casca protegida (requireOrg) + telas migradas
    layout.tsx  error.tsx  loading.tsx  not-found.tsx  globals.css
  components/
    shared/             Sidebar, Topbar, ThemeToggle, LogoMark
    ui/                 (design-system compartilhado)
  features/<feature>/   page/components/queries/actions/schemas/types/*.module.css
  lib/
    supabase/{client,server,middleware}.ts   Clientes browser/servidor + refresh de sessão
    auth/session.ts     requireUser / requireOrg / can (autorização no servidor)
    env/  errors/  database.types.ts (tipos do banco, gerados via MCP Supabase)
  config/nav.ts         Itens de navegação
  middleware.ts         Guarda de autenticação (SSR)
```

### Princípios aplicados
- **Server Components por padrão**; Client Components só nas folhas interativas.
- **Mutações via Server Actions** com `ActionResult` tipado; validação e autorização no
  servidor (nunca confiar no navegador). RLS é a barreira real no banco.
- **Auth SSR por cookies** (`@supabase/ssr`): páginas privadas validadas no servidor,
  middleware renova a sessão e redireciona não-autenticado.
- **Tema** em cookie (sem flash/hidratação); única preferência local.

## Estado da migração
Fases 1 (auditoria+matriz), 2 (fundação) e 3 (casca) concluídas. Fase 4 migra as features
uma a uma (ordem em `docs/migration-matrix.md`). Enquanto uma feature não está migrada e
validada ponta a ponta, o app legado continua sendo a versão publicada.
