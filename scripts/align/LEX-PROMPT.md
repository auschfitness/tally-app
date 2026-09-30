# Glosas e definições em português (lote NN)

Entrada: `scripts/align/work/lex-NN.input.json` = `[{ strong, lemma, gloss, definition }]` (verbete inglês do léxico STEPBible, CC BY 4.0).
Saída: `scripts/align/work/lex-NN.pt.json` = `[{ strong, gloss_pt, definition_pt }]`, um item por entrada, mesma ordem.

- `gloss_pt`: sentidos curtos em português do Brasil, separados por vírgula, no máximo 6 palavras ("palavra, mensagem, razão").
- `definition_pt`: 1 a 3 frases curtas, PT-BR, só o que o verbete diz (sem teologia nova, sem opinião). Referências bíblicas no formato brasileiro ("Jo 1.1").
- Nada de inglês no resultado. Nomes próprios no nome usual em português ("Pedro", "Jerusalém").
- Não traduzir literalmente abreviações do léxico (LXX, al., cf.): omitir.

Ao terminar, rode `node scripts/align/validate-lexicon.mjs NN`.
