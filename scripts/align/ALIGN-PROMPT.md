# Ligação Bíblia Livre ↔ grego (um capítulo de João)

Entrada: `scripts/align/work/jhn-NN.input.json` = `{ chapter, verses: [{ verse, pt, greek: [{ p, w, s, g }] }] }`
(`pt` = texto português exato; `greek` = palavras gregas com Strong `s` e glosa inglesa `g`).

Saída: `scripts/align/work/jhn-NN.align.json` = `[{ verse, spans: [{ t, s }] }]`.

Regras (o validador recusa o arquivo se alguma falhar):
1. Concatenar os `t` de um versículo, na ordem, devolve `pt` EXATAMENTE (espaços e pontuação inclusos). Não corrigir, não normalizar.
2. Trecho com Strong (`s` preenchido) não começa nem termina com espaço ou pontuação. Espaços e pontuação ficam em trechos `s: null`.
3. `s` só pode ser um Strong que aparece nos `greek` daquele versículo.
4. Um Strong por trecho. Artigos e preposições portuguesas que só introduzem a palavra entram no trecho dela ("No princípio" → Strong de ἀρχῇ). Artigo grego (G3588) só ganha trecho próprio se não houver palavra de conteúdo para ele.
5. Palavra portuguesa sem correspondente grego (acréscimo da tradução) fica `s: null`.
6. Na dúvida, `s: null`. Errar por omissão é melhor que ligar errado.
7. Meta: pelo menos 85% das palavras gregas de conteúdo (Strong ≠ G3588) ligadas a algum trecho.

Escreva só o JSON no arquivo de saída. Ao terminar, rode `node scripts/align/validate-alignment.mjs NN` e corrija até passar.
