# Deploy do app Next.js (Tally) na Vercel

O app novo (Next.js + Supabase) vive nesta pasta **`web/`**, dentro do repositório
`tally-app/`. O app legado (Vite) segue na raiz do repo como fallback até o legado ser
aposentado. Por isso a Vercel precisa saber que deve construir a subpasta `web/`.

## 1) Configurar o projeto na Vercel (painel — ação do dono)
No projeto da Vercel ligado a este repositório:

- **Root Directory:** `web`  ← passo-chave. É o que faz a Vercel construir o app Next
  (e não o app Vite da raiz). Framework: **Next.js** (detectado sozinho).
- **Environment Variables** (só chaves PÚBLICAS — a segurança está no RLS; **nunca** a
  `service_role`):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://zzgxeylyrtzsqcdguxql.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a anon/publishable key (a mesma de `web/.env.local`)
- Build/Output: padrão do Next (não precisa mexer).

## 2) Supabase Auth (ação do ORQUESTRADOR — senão login/OAuth quebram)
Em **Supabase → Authentication → URL Configuration**, adicionar as URLs da Vercel
(produção **e** previews) em **Site URL** + **Redirect URLs**. Sem isso, Google OAuth e
magic links falham. "Confirm email" segue desligado (login e-mail+senha entra na hora).

## 3) Ordem segura da virada
1. Deploy da branch → abrir a **URL de preview** e validar (login → dados → navegar).
2. Só então **promover a produção**.
3. Manter o app legado acessível por um tempo como fallback (ele continua no repo, na
   raiz; a qualquer momento a Vercel pode voltar a Root Directory da raiz).

## Observações
- Enquanto o **Root Directory** continuar na raiz do repo, a produção segue servindo o
  **app legado** — mudar para `web` é o momento real da virada. Merge do código em `main`
  por si só **não** troca o app no ar.
- `web/.env*` está no `.gitignore` (repo público — zero segredos no git).
- Pré-requisitos já verdes: `npm run verify` (typecheck+lint+179 testes+build) e e2e
  (login → dados semeados → logout).
