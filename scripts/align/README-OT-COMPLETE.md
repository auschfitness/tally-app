# Sublinhado completo do Antigo Testamento

A carga estatística existente já cobre os 39 livros e 23.145 versículos, com
66,1% das palavras portuguesas ligadas a Strong. Esta frente gera ligações para
as palavras restantes com o Gemini, usando o mesmo método do NT. Não altera o
texto da Bíblia e não grava no banco durante a geração.

## Geração e retomada

Da raiz do projeto, com as chaves já configuradas:

```powershell
node --env-file=.env.local scripts/align/run-complete-ot.mjs
```

Esse comando encadeia piloto, medição, geração, montagem e preparação do SQL.
O progresso da etapa fica em `work/gem-ot/pipeline-status.json`. Não inicia a
carga no banco. Se houver bloqueio, repetir o comando retoma o que já foi aprovado.
Não executar duas cópias ao mesmo tempo.

Para executar cada etapa separadamente:

```powershell
node --env-file=.env.local scripts/align/run-gemini-ot.mjs --pilot
node scripts/align/measure-ot.mjs
node --env-file=.env.local scripts/align/run-gemini-ot.mjs
node scripts/align/build-ot.mjs
```

São 929 capítulos, sendo 12 com gabaritos manuais preservados na carga final.
O piloto mede Gn 22, Rt 1, Sl 51, Pv 3, Jr 31 e 2Rs 5. Resultados e logs ficam
em `scripts/align/work/gem-ot-word-pilot/`; a geração final fica em `work/gem-ot/`,
separada da geração do NT. A execução usa dois
processos de geração, para não consumir toda a cota em uma rajada.

O coordenador para quando a API esgota a cota ou um processo falha. Para retomar,
execute o mesmo comando. Capítulos concluídos são pulados. Versículos aprovados
de capítulos incompletos são preservados em arquivos `.partial.json`, com hash
da fonte e nome do modelo, para evitar perder chamadas ou reaproveitar texto
de uma versão diferente.

## Conferências antes da carga

- Texto recomposto idêntico ao português original, sem alterar nenhuma palavra.
- Strong pertencente ao próprio versículo.
- Nenhuma palavra sem Strong em saída Gemini aprovada.
- Concordância de pelo menos 85% por capítulo frente às ligações estatísticas.
- Medição de pelo menos 94% de concordância nas palavras comparáveis dos gabaritos.
- Todos os 929 capítulos presentes e cobertura final de pelo menos 95%.

Na geração do AT, o modelo retorna apenas Strong para cada posição de palavra
portuguesa numerada. A montagem recompõe os trechos diretamente do texto fonte,
recusando posições ausentes, repetidas ou Strong fora do versículo. Isso elimina
alterações de texto pelo modelo e reduz o volume da resposta.

Grafia, pontuação e espaços omitidos pelo modelo só são restaurados quando a
sequência completa de letras e números coincide com a fonte. Palavras alteradas,
removidas ou acrescentadas impedem esse reparo. Cada versículo reparado passa
novamente pelas conferências. A comparação tokeniza o texto inteiro, para não
contar como duas palavras uma palavra dividida em dois trechos.

Um versículo que falhar nas tentativas usa o alinhamento estatístico na montagem,
sem inventar ligação. Isso é contabilizado como fallback e reduz a cobertura
final. Gabaritos manuais são preservados, inclusive suas omissões. A montagem
recusa gerar o TSV de carga se a cobertura final ficar abaixo de 95%.

## Preparação e gravação

Somente depois de a montagem estar completa e aprovada:

```powershell
node scripts/align/prepare-complete-ot.mjs
```

Gera dados JSON, manifesto com hash e reserva conservadora de espaço, senha
aleatória e SQL preenchido em `work/gem-ot/load/` (gitignored). O SQL permite
apenas atualização dos versículos do AT, preservando o NT e a tabela atual.

O AGENTS.md exige aprovação antes de carga grande. Sem service_role neste
workspace, o dono cola `work/gem-ot/load/load.sql` no SQL Editor do Supabase.
Depois da revisão e aprovação:

```powershell
node --env-file=.env.local scripts/align/load-complete-ot.mjs --status
node --env-file=.env.local scripts/align/load-complete-ot.mjs --load
```

A carga confere o hash, o espaço disponível, cada lote por leitura e a contagem
do NT. Se houver erro, os lotes concluídos permanecem gravados; é possível retomar
por upsert. Ao final, o dono apaga a função:

```sql
drop function if exists public.tmp_tagged_ot_load(text,jsonb);
select pg_size_pretty(pg_database_size(current_database()));
```

Depois da carga, conferir no leitor Gênesis, Salmos e Daniel, com Interlinear
ligado. Nenhuma publicação de código é necessária para o leitor usar os dados.

## Testes do fluxo

```powershell
node --test scripts/align/alignment-quality.test.mjs
npm run verify
npx playwright test e2e/reader.spec.ts
```

Os arquivos grandes e o progresso da geração permanecem locais. Não versionar
chaves, senhas ou arquivos da pasta `work/`.

Piloto conferido em 04/10/2026: todos os seis capítulos, 167 versículos e 3.887
palavras, 100% de cobertura, 94,39% de concordância nas palavras comparáveis dos
gabaritos. Essa medição não é revisão manual de todo o AT. A carga final preserva
os 12 capítulos com gabarito e mede a cobertura novamente no conjunto completo.
