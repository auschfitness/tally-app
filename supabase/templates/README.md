Assunto: **Redefinir sua senha na Mercy**

1. Supabase → Authentication → Email Templates → aba "Reset Password".
2. Cole o assunto acima em Subject e o conteúdo de `recovery.html` em Body.
3. Clique em Save.

O app já envia o link com `redirectTo` para `/auth/callback?next=/redefinir-senha` (`src/app/(auth)/esqueci-senha/actions.ts`), então nada muda no código.
