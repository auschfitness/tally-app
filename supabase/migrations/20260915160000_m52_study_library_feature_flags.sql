-- m52 — flag da Biblioteca do Estudo (spec 06, Erro no 2).
-- A biblioteca nova (uma acao primaria, sermao em andamento no topo, um filtro de status)
-- nasce atras desta flag. Desligada, /study e exatamente a tela de hoje.
-- Nasce rollout='off' + enabled=false, como todas. Idempotente.
insert into public.feature_flags (key, description) values
  ('study.library_v2', 'Biblioteca do Estudo reformulada (spec 06)')
on conflict (key) do nothing;
