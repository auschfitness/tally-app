# Migrations do Tally (Supabase)

Histórico versionado do schema. Cada arquivo é uma migração aplicada no projeto Supabase
`zzgxeylyrtzsqcdguxql`, no padrão da Supabase CLI: `<timestamp>_<nome>.sql`, aplicadas em ordem
crescente de nome. São **48 migrações** (m1 → m46, mais `add_profiles_locale` e
`profiles_autocreate_and_backfill`, que não seguem a numeração `m`).

Estes arquivos foram reconstruídos 1:1 a partir do que o Supabase guarda em
`supabase_migrations.schema_migrations` — são exatamente o SQL que já rodou em produção.

## Para que servem
- **Fonte da verdade do schema no git** — não dependemos mais só da infra do Supabase.
- **Recriar o banco do zero** (novo projeto Supabase, ou ambiente de teste de um dev).
- **Migrar para outro banco** no futuro.

## Como recriar o banco localmente (dev)
Com a [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase start          # sobe um Postgres+Auth local
supabase db reset        # aplica TODAS as migrations desta pasta, em ordem
```

Ou aplicar contra um projeto remoto novo:

```bash
supabase link --project-ref <novo-ref>
supabase db push
```

## Avisos importantes
- As migrações assumem o ambiente **Supabase**: usam o schema `auth` (`auth.users`, `auth.uid()`),
  os papéis `anon`/`authenticated` e a publicação `supabase_realtime`. Elas replicam limpo em um
  **projeto Supabase novo**. Para um Postgres puro (não-Supabase), seria preciso primeiro criar
  esses objetos (schema auth, roles, `auth.uid()`), senão algumas falham.
- Algumas migrações têm **seed/backfill** (ex.: `m7` demo, `m27`/`m31` backfill de orgs existentes).
  Em banco novo, os backfills simplesmente não encontram linhas e passam sem efeito — é seguro.
- **Não edite** um arquivo já aplicado. Mudanças de schema entram como uma **nova** migração
  (próximo número), mantendo o histórico linear.
- Daqui pra frente, ao aplicar uma migração nova no Supabase, salve o `.sql` correspondente aqui
  para o repo seguir espelhando o banco.
```
