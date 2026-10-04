-- A senha é preenchida pelo prepare-complete-ot.mjs. Executar só após revisão da carga.
create or replace function public.tmp_tagged_ot_load(p_token text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_token is distinct from '__LOAD_TOKEN__' then raise exception 'token'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 100 then
    raise exception 'Esperado lote de até 100 versículos';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('database_bytes', pg_database_size(current_database()),
      'nt_verses', (select count(*) from public.bible_tagged_verses where translation = 'por_blj' and book = any(array['Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'])));
  end if;
  if pg_database_size(current_database()) + octet_length(p_rows::text) * 3 + 16777216 >= 480000000 then
    raise exception 'Espaço insuficiente';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    where coalesce(r->>'translation','') <> 'por_blj'
    or not (coalesce(r->>'book','') = any(array['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal']))
    or coalesce((r->>'chapter')::int,0) < 1 or coalesce((r->>'verse')::int,0) < 1
    or jsonb_typeof(r->'spans') is distinct from 'array') then
    raise exception 'Versículo do AT inválido';
  end if;
  insert into public.bible_tagged_verses (translation,book,chapter,verse,spans)
  select translation,book,chapter,verse,spans from jsonb_to_recordset(p_rows)
    as r(translation text, book text, chapter int, verse int, spans jsonb)
  on conflict (translation,book,chapter,verse) do update set spans = excluded.spans;
  get diagnostics n = row_count;
  if pg_database_size(current_database()) >= 480000000 then raise exception 'Limite de segurança atingido'; end if;
  return jsonb_build_object('loaded',n,'database_bytes',pg_database_size(current_database()));
end $$;
revoke all on function public.tmp_tagged_ot_load(text,jsonb) from public,authenticated;
grant execute on function public.tmp_tagged_ot_load(text,jsonb) to anon;
select pg_size_pretty(pg_database_size(current_database()));

-- Após terminar ou desistir: drop function public.tmp_tagged_ot_load(text,jsonb);
