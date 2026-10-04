# Tarefa 5: UBS hebraico (SDBH)

Usa a edição oficial portuguesa da UBS v0.9.3, licenciada CC BY-SA 4.0:
https://github.com/ubsicap/ubs-open-license/tree/main/dictionaries/hebrew

Crédito: UBS Dictionary of Biblical Hebrew © United Bible Societies, 2023.
Adaptado do Semantic Dictionary of Biblical Hebrew © 2000-2023 United Bible Societies.
Texto português publicado pela UBS, adaptação de formato Tally. Os 29 rótulos de
domínio sem localização portuguesa foram traduzidos pela Tally em `hebrew-data.mjs`.
As definições não são retraduzidas. A licença e o README originais são preservados
com os dados em `work/hebrew/`. O manifesto registra URLs e SHA-256 dos arquivos.

## Preparação e conferência

```powershell
node scripts/ubs/prepare-hebrew.mjs
node --test scripts/ubs/hebrew.test.mjs
node scripts/ubs/seed-ubs.mjs --check
npm run verify
npx playwright test e2e/ubs-hebrew.spec.ts e2e/reader.spec.ts
```

Preparação em 04/10/2026: 7.941 entradas, 18.620 linhas, 7.981 Strong distintos,
9,88 MB de JSON. Reserva conservadora: 46,41 MB (JSON vezes três + 16 MiB).
O tamanho real do PostgreSQL depende de índices, TOAST e dados já presentes;
esta reserva é uma estimativa, não uma medição do banco.

1.158 sentidos com Strong não têm texto PT na fonte; 10 estão vazios. Eles não
entram na carga. Outros 1.099 sentidos não têm Strong reconhecido e não podem ser
ligados à palavra do leitor. Sem sentido UBS disponível, continua o STEPBible.
As referências por palavra são reduzidas e deduplicadas por versículo OSIS.
Strong aramaico A é normalizado para H, conforme o léxico usado pelo app.
O mapa TAHOT do STEPBible (CC BY 4.0) converte a numeração massorética para a do
leitor, incluindo Salmos 51.12 para 51.10. Foram convertidas 11.045 referências;
7.827 correspondências sem Strong compatível, ambíguas ou de títulos de salmos
ficaram sem marcação de sentido do versículo. Seus sentidos continuam no verbete.
Fonte do mapa: https://github.com/STEPBible/STEPBible-Data/tree/master/Translators%20Amalgamated%20OT%2BNT

`work/hebrew/rows.json`, `manifest.json`, `load.sql` e `load-token.txt` são locais
e ignorados pelo Git. Os lotes gregos permanecem separados. Reexecutar a preparação
usa os mesmos arquivos baixados e preserva a senha local. Para atualizar a fonte,
guarde a carga anterior e baixe a nova versão em uma pasta separada para revisão.

## Carga, após aprovação

O AGENTS.md exige aprovação para carga grande e orienta o dono a executar SQL,
pois este workspace não tem service_role. Não é necessária uma tabela nova.

1. Colar **`scripts/ubs/work/hebrew/load.sql`** inteiro no SQL Editor do Supabase.
   A senha aleatória já está preenchida. O resultado mostra o tamanho atual.
2. Conferir o tamanho e as contagens sem gravar:

   ```powershell
   node --env-file=.env.local scripts/ubs/seed-hebrew.mjs --status
   ```

3. Depois de aprovada a carga:

   ```powershell
   node --env-file=.env.local scripts/ubs/seed-hebrew.mjs --load
   ```

O script recusa a carga se tamanho atual + reserva superar 480 MB. A função também
confere o espaço a cada lote e só permite Strong H. A carga usa upsert, pode ser
retomada após falha e não apaga dados. Ao fim compara a contagem do grego e confere
o sentido de "criou" em Gn 1.1. Uma falha depois de alguns lotes preserva os lotes
já gravados; execute novamente após corrigir a causa.

4. Apagar a função temporária logo após terminar (também se desistir da carga):

   ```sql
   drop function if exists public.tmp_ubs_hebrew_load(text, jsonb);
   select pg_size_pretty(pg_database_size(current_database()));
   select count(*) from public.ubs_senses where strong like 'H%';
   ```

5. Conferir no app: Gênesis 1, Interlinear ligado, "criou". O crédito deve mostrar
   SDBH e edição portuguesa UBS. Conferir também João 1 para o grego.
6. Publicar o código verificado na main apenas depois da aprovação.

## Prévia

`docs/previews/task5-hebrew-gen1.png` usa a consulta UBS simulada no e2e. Demonstra
a interface e o crédito antes da carga, não prova dados gravados em produção.

Verificação em 04/10/2026: `npm run verify` passou (545 testes, lint, tipos e build);
6 testes de importação passaram; Playwright passou nos 11 testes de leitura e SDBH.
O tamanho atual do banco só poderá ser confirmado pelo SQL, antes da carga.
