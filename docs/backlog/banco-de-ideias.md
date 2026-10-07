# Banco de ideias

Ideias que o dono quer guardar para depois. Não estão na fila; cada uma vira spec quando entrar.

## Busca por sentido (embeddings), anotada em 2026-10-07

Origem: EmbeddingGemma 2 do Google (https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/).
Modelo gratuito (Apache 2.0) que transforma texto em vetores de sentido; 270M parâmetros só texto,
8K de contexto, 768 dimensões que podem ser cortadas para 256/128 (Matryoshka). Roda local
(transformers.js, Ollama, llama.cpp).

Usos na Mercy, do mais forte ao mais fraco:
1. **Busca por tema na Bíblia**: "perdão entre irmãos" acha Mt 18, Ef 4:32, Cl 3:13 sem a palavra exata.
2. **Sermões e notas antigas pelo assunto**: "já preguei sobre ansiedade?".
3. **Referências cruzadas sugeridas**: versículos parecidos com o aberto.

Decisão pendente: onde roda a pergunta na hora da busca (tem que ser o mesmo modelo dos versículos).
- No navegador: ~190 MB no primeiro uso. Pesado demais para o público.
- Servidor próprio: custo mensal e mais uma peça.
- Embedding pago do Gemini no lugar deste: centavos/mês, sem servidor. Provável padrão.

Custo de banco: ~31 mil versículos em 256 dimensões com pgvector ≈ 30-40 MB (banco em 330/500 MB).
Gerar os vetores dos versículos é de graça, uma vez, no PC (mesmo esquema do alinhamento do AT).

Próximo passo quando voltar: escolher o recurso (sugestão: busca por tema na Bíblia) e escrever a spec.
