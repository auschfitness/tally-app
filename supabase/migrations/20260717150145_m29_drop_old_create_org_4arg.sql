-- Remove a sobrecarga antiga (sem país). A chamada de 4 args passa a cair na de 5 args (país default 'BR').
drop function if exists public.create_org(text, text, text, jsonb);
