# Conferência da carga do Antigo Testamento

Conferido em 04/10/2026, por leitura da tabela de produção `bible_tagged_verses`,
tradução `por_blj`, com a anon key. Nenhuma gravação foi feita.

A carga do AT já está presente. Foram comparados todos os trechos, seus textos,
Strong e ordem por versículo com `scripts/align/work/tagged-ot-stat.tsv`, usando
`tagged-ot-gold.tsv` como substituição integral dos versículos com gabarito.

| Conferência | Resultado |
| --- | ---: |
| Livros | 39 |
| Versículos preparados | 23.145 |
| Versículos no banco | 23.145 |
| Versículos com gabarito | 289 |
| Versículos faltando | 0 |
| Versículos com trechos diferentes | 0 |
| Versículos extras | 0 |

O leitor já consulta esta tabela, conforme `getTaggedChapter` em
`src/features/study/reader-queries.ts`. Não há carga pendente destes arquivos.

## Cobertura é uma etapa diferente

Dos 539.908 grupos de letras portuguesas nos trechos preparados, 356.610 estão em
trechos com Strong: 66,1%. Contagem por expressão `\p{L}+`, excluindo pontuação e
espaços, sem exigir uma ligação separada para cada palavra de um mesmo trecho.

Portanto, completar o sublinhado para todas as palavras requer melhorar o
alinhamento e validar os novos dados. Recarregar os mesmos TSVs não aumenta a
cobertura. Os números históricos de 73% no backlog medem palavras do original
hebraico nos capítulos de avaliação; são uma métrica diferente.

O resultado bruto desta auditoria foi salvo localmente em
`scripts/align/work/audit-tagged-ot.json` (gitignored).
