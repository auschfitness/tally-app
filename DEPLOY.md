# Deploy do Tally (Next.js) na Vercel

O app agora vive na **raiz do repositório** `tally-app/` (o app legado Vite foi
aposentado; um backup fica na tag git `backup/legacy-vite`). Por estar na raiz, a
Vercel detecta o Next.js sozinha — **não precisa** configurar "Root Directory".

## 1) Configurar o projeto na Vercel (painel — ação do dono)
Ao importar o repositório `tally-app`:

- **Root Directory:** deixe o padrão (a raiz). Framework: **Next.js** (detectado sozinho).
- **Environment Variables** (só chaves PÚBLICAS — a segurança está no RLS; **nunca** a
  `service_role`):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://zzgxeylyrtzsqcdguxql.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a anon/publishable key (a mesma de `.env.local`)
- Build/Output: padrão do Next (não precisa mexer).

## 2) Supabase Auth (ação do ORQUESTRADOR — senão login/OAuth quebram)
Em **Supabase → Authentication → URL Configuration**, adicionar as URLs da Vercel
(produção **e** previews) em **Site URL** + **Redirect URLs**. Sem isso, Google OAuth e
magic links falham. "Confirm email" segue desligado (login e-mail+senha entra na hora).

## 3) Ordem segura da virada
1. Deploy → abrir a **URL de preview** e validar (login → dados → navegar).
2. Só então **promover a produção**.

## Observações
- `.env*` está no `.gitignore` (repo público — zero segredos no git). O `.env.test`
  (credenciais da fixture) também é ignorado.
- Pré-requisitos verdes: `npm run verify` (typecheck+lint+testes+build) e e2e
  (login → dados semeados → logout).
- Recuperar o legado, se um dia precisar: `git checkout backup/legacy-vite`.
