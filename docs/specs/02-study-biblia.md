# Spec 02 — Estudo: bíblia e interlinear (FASE 1, paralelo)

Escopo: `src/features/study/**`, `src/app/(dashboard)/study/**`, migrations de texto bíblico.

## Situação

4131 linhas — o maior módulo do app, e o que o dono mais rejeita. Já existem as migrations
`m34_bible_original_text`, `m35_strong_frequency`, `m36_bible_book_context`,
`m33_cross_references_global`. A estrutura está lá; o **conteúdo** e a apresentação é que
não servem.

## Antes de escrever uma linha: a questão jurídica

Esta é a tarefa mais arriscada do projeto, e o risco não é técnico.

**ARA, ARC, NVI, NAA, NTLH e ACF são protegidas por direito autoral** das sociedades
bíblicas (SBB, Biblica, SBTB). Distribuir o texto delas dentro de um SaaS pago, sem
licença assinada, é exposição real — e a igreja é justamente o público que reporta.

Material de uso livre, que é onde o módulo deve se apoiar:

| camada | fonte | observação |
|---|---|---|
| Hebraico AT | Westminster Leningrad Codex / Open Scriptures Hebrew Bible | domínio público / CC BY |
| Grego NT | SBLGNT, MorphGNT, Texto Bizantino | licenças livres com atribuição |
| Morfologia e lemas | OSHB / MorphGNT | acompanham o texto |
| Strong's | domínio público | já usado no `m35` |
| Português | Almeida Corrigida Livre (ACL) / Almeida 1911 | domínio público |
| Inglês (fase EUA) | KJV, World English Bible, Berean | livres |

**Primeira tarefa do agente:** confirmar a licença exata de cada fonte escolhida, registrar
em `docs/bible-sources.md` com link e texto da licença, e só então importar. Se uma versão
popular for indispensável comercialmente, isso vira negociação de licença com a sociedade
bíblica — decisão do dono, não do código.

## Parte A — Versões

Schema: `bible_versions` (code, name, language, license, license_url, source_url,
is_original) e `bible_verses` (version_code, book, chapter, verse, text) com índice
composto. Importação por script em `scripts/`, idempotente, com `ON CONFLICT DO NOTHING`.

Seletor de versão na leitura, com comparação lado a lado de até 3 versões. Guardar a
preferência por usuário.

Rodapé de cada tela de leitura mostra a atribuição exigida pela licença. Não é detalhe:
é o que mantém o uso legítimo.

## Parte B — Interlinear

O pedido é texto original → português, palavra a palavra, e o que existe hoje não atende.

Modelo de dado — uma linha por palavra do original:

```sql
create table public.bible_original_words (
  id bigserial primary key,
  book text not null, chapter int not null, verse int not null,
  position int not null,              -- ordem no versículo original
  surface text not null,              -- palavra como aparece
  lemma text,                         -- forma de dicionário
  strong text,                        -- G0025 / H0430
  morph text,                         -- código morfológico da fonte
  transliteration text,
  gloss_pt text,                      -- glosa curta em português
  unique (book, chapter, verse, position)
);
```

Pontos que decidem se fica bom ou ruim:

- **Direção do hebraico.** AT é RTL. A linha do original precisa de `dir="rtl"` e a ordem
  visual das colunas inverte. Ignorar isso é o erro mais comum e o mais visível.
- **Glosa não é tradução.** `gloss_pt` é uma palavra ou duas, de dicionário, e não forma
  frase em português. Deixe isso explícito na interface, senão o pastor cita errado do
  púlpito achando que é tradução.
- **Alinhamento visual.** Cada palavra é um bloco vertical: original / transliteração /
  glosa / Strong. Blocos alinham pelo topo e quebram linha juntos. Fonte serifada e corpo
  maior no original — é o texto que a pessoa veio ler.
- **Toque na palavra** abre painel lateral: Strong completo, morfologia por extenso (não o
  código cru — traduza `V-PAI-3S` para "verbo, presente ativo indicativo, 3ª pessoa do
  singular"), e ocorrências no cânon usando `m35_strong_frequency`.
- Alternar entre interlinear e leitura corrida sem perder a posição.

## Parte C — Interface

Vale o sistema da Fase 0, e aqui com mais rigor: tela de leitura é tipografia, não
dashboard. Medida de linha entre 60 e 75 caracteres. Corpo maior que o resto do app
(17px). Número de versículo em superíndice discreto, cor secundária, nunca azul. Fundo
sem cartão — o texto respira direto sobre a superfície. Nada de badge colorido.

Modo foco (esconde navegação) e respeito a `prefers-color-scheme` no tema escuro, que é
onde muita gente lê de madrugada.

## Flags

```
study.bible_v2      versões novas + seletor
study.interlinear   interlinear reformulado
```

## Pronto quando

- [ ] `docs/bible-sources.md` com licença de cada fonte, verificada e linkada
- [ ] nenhuma versão protegida por direito autoral no banco
- [ ] AT renderiza RTL corretamente, incluindo quebra de linha
- [ ] painel de palavra mostra morfologia por extenso em português
- [ ] atribuição de licença visível na tela de leitura
- [ ] `npm run verify` verde
