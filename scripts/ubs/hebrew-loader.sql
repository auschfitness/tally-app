-- Gerado com senha aleatória por prepare-hebrew.mjs. Colar no SQL Editor.
-- A função só escreve Strong H; não altera o dicionário grego.
create or replace function public.tmp_ubs_hebrew_load(p_token text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; used bigint;
begin
  if p_token is distinct from '__LOAD_TOKEN__' then raise exception 'token'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 100 then
    raise exception 'Esperado lote de até 100 linhas';
  end if;
  used := pg_database_size(current_database());
  if jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('database_bytes', used,
      'hebrew_rows', (select count(*) from public.ubs_senses where strong like 'H%'),
      'greek_rows', (select count(*) from public.ubs_senses where strong like 'G%'));
  end if;
  if used + octet_length(p_rows::text) * 3 + 16777216 >= 480000000 then
    raise exception 'Carga suspensa: banco próximo do limite de 500 MB';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    where coalesce(r->>'strong', '') !~ '^H[0-9]{4}$'
      or coalesce(r->>'sense_id', '') = '' or coalesce(r->>'lemma', '') = '') then
    raise exception 'Linha hebraica inválida';
  end if;
  insert into public.ubs_senses
    (strong, sense_id, lemma, entry_code, ord, glosses, definition, comments, domains, subdomains, refs)
  select r.strong, r.sense_id, r.lemma, r.entry_code, r.ord, r.glosses, r.definition,
    r.comments, r.domains, r.subdomains, r.refs
  from jsonb_to_recordset(p_rows) as r(strong text, sense_id text, lemma text,
    entry_code text, ord int, glosses text[], definition text, comments text,
    domains text[], subdomains text[], refs text[])
  on conflict (strong, sense_id) do update set
    lemma = excluded.lemma, entry_code = excluded.entry_code, ord = excluded.ord,
    glosses = excluded.glosses, definition = excluded.definition, comments = excluded.comments,
    domains = excluded.domains, subdomains = excluded.subdomains, refs = excluded.refs;
  get diagnostics n = row_count;
  if pg_database_size(current_database()) >= 480000000 then
    raise exception 'Carga suspensa: limite de segurança atingido';
  end if;
  return jsonb_build_object('loaded', n, 'database_bytes', pg_database_size(current_database()));
end $$;
revoke all on function public.tmp_ubs_hebrew_load(text, jsonb) from public, authenticated;
grant execute on function public.tmp_ubs_hebrew_load(text, jsonb) to anon;

-- Espaço real agora. Compartilhar estes números antes de aprovar a carga.
select pg_size_pretty(pg_database_size(current_database())) as tamanho,
  pg_database_size(current_database()) as bytes;
