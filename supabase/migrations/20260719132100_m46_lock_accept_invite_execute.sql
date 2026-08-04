
-- m46 — Hardening: accept_member_invite so pode ser chamada por usuario autenticado.
-- (O revoke de 'anon' no m44 nao bastou: PUBLIC tem EXECUTE por padrao.)
revoke execute on function public.accept_member_invite(text) from public;
revoke execute on function public.accept_member_invite(text) from anon;
grant execute on function public.accept_member_invite(text) to authenticated;
