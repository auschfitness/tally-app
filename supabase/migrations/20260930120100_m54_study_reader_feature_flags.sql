-- m54: flag da tela de leitura da Bíblia (spec 07). Nasce rollout='off' + enabled=false,
-- como todas. Desligada, /study/bible não existe (404) e a sub-nav não mostra "Bíblia".
-- Reverter: delete from public.feature_flags where key = 'study.reader';
insert into public.feature_flags (key, description) values
  ('study.reader', 'Tela de leitura da Bíblia (spec 07)')
on conflict (key) do nothing;
