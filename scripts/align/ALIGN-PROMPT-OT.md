# Gabarito Bíblia Livre ↔ hebraico/aramaico (um capítulo do AT)

Serve para MEDIR o alinhador estatístico; precisa ser ligado à mão, com cuidado. Nunca gere por script.

Entrada: `scripts/align/work/ot/<LIV>-<CAP>.json` = `{ book, chapter, verses: [{ verse, pt, greek: [{ p, w, s, g }] }] }`
(`pt` = texto português exato; `greek` guarda as palavras HEBRAICAS (ou aramaicas) com Strong `s` e glosa inglesa `g`).
Cada palavra hebraica já inclui seus prefixos (ו "e", ה "o/a", ב "em", ל "para/a", מ "de", כ "como"), mas tem um Strong só, o da palavra principal.

Saída: `scripts/align/work/ot/<LIV>-<CAP>.gold.json` = `[{ verse, spans: [{ t, s }] }]`.

Regras (o validador recusa o arquivo se alguma falhar):
1. Concatenar os `t` de um versículo, na ordem, devolve `pt` EXATAMENTE (espaços e pontuação inclusos). Não corrigir, não normalizar.
2. Trecho com Strong (`s` preenchido) não começa nem termina com espaço ou pontuação. Espaços e pontuação ficam em trechos `s: null`.
3. `s` só pode ser um Strong que aparece nos `greek` daquele versículo.
4. Um Strong por trecho. Artigo, preposição e "e" portugueses que vêm de um PREFIXO da palavra hebraica entram no trecho dela ("e a terra" ← וְהָאָרֶץ inteiro com o Strong de terra; "No princípio" ← בְּרֵאשִׁית). Se o "e"/preposição tem palavra hebraica própria com Strong (ex.: אֶל H0413, עַל H5921, כִּי H3588), ganha trecho próprio.
5. A marca de objeto את (H0853) normalmente não tem palavra portuguesa: não ligue nada a ela.
6. Palavra portuguesa sem correspondente hebraico (acréscimo da tradução) fica `s: null`.
7. Na dúvida, `s: null`. Errar por omissão é melhor que ligar errado.
8. Meta: pelo menos 85% das palavras hebraicas de conteúdo (Strong ≠ H0853) ligadas a algum trecho.

Escreva o JSON com a ferramenta Write (sem script, sem gerar por código). Ao terminar, rode
`node scripts/align/validate-alignment.mjs gold <LIV>-<CAP>` (da raiz do repo) e corrija até passar.
