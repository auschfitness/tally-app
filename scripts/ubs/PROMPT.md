# Dicionário UBS: espanhol → português (lote NN)

Entrada: `scripts/ubs/work/ubs-NN.input.json` = `[{ id, glosses, short, comments }]`
(Dicionário Grego do NT da UBS, em espanhol).
Saída: `scripts/ubs/work/ubs-NN.pt.json` = `[{ id, glosses_pt, short_pt, comments_pt }]`, um
item por entrada, mesma ordem, mesmo `id`.

REGRA ABSOLUTA: traduza você mesmo, lendo e escrevendo o texto. É PROIBIDO usar Bash,
Python, Node ou qualquer programa, dicionário automático ou substituição de palavras por
regra. Use só a ferramenta Read para ler a entrada e Write para gravar a saída. Lote feito
por programa é detectado e jogado fora.

- Português do Brasil, natural e fiel, sem resumir nem acrescentar nada.
- `glosses_pt`: array com as mesmas glosas traduzidas ("bautizar" → "batizar").
- `short_pt`: a definição traduzida inteira.
- `comments_pt`: o comentário traduzido INTEIRO (pode ser longo; não corte). Mantenha o
  separador ` | ` entre parágrafos. Vazio na entrada = `""` na saída.
- Palavras gregas e hebraicas ficam exatamente como estão.
- Referências bíblicas no padrão brasileiro: "Jn 3.16" → "Jo 3.16", "Hch" → "At",
  "Ro" → "Rm", "Stg" → "Tg", "Mr" → "Mc", "Gá" → "Gl", "Fil" → "Fp", "He" → "Hb".
- Nada de espanhol no resultado ("el", "los", "y", "según", "-ción" → "-ção").
- JSON válido (aspas duplas dentro do texto escapadas como \").

Se o arquivo for grande, escreva a saída inteira de uma vez com Write mesmo assim.
