# Step #5 · Fase 3 (Escritura: reconhecimento + painel + comparação) — nota de handoff

Divisão: **banco = orquestrador**, **front = Claude Code**. Schema pequeno (1 tabela); o texto bíblico vem de API externa, NÃO do nosso banco.
Protocolo: proponha o SQL em `.tmp/step-5-fase3/migration.sql` e PARE; o orquestrador aplica com RLS/advisors e escreve `SCHEMA-READY.md`.

## DECISÃO — fonte do texto bíblico (definida com o dono)
Usar a **Free Use Bible API — https://bible.helloao.org** como fonte primária:
- Grátis, **sem chave**, sem limite de requisições, **liberada para uso comercial** (Tally é SaaS — isso importa), 1.000+ traduções (PT e EN), JSON.
- Buscar o texto **sob demanda** (fetch client-side). NÃO importar Bíblia pro Supabase.
- Arquitetura **plugável**: encapsular a fonte atrás de um `bible-source.js` para depois somar "A Bíblia Digital" (PT: ACF/RA/APEE, token grátis) ou wldeh/bible-api sem reescrever a UI.
- Ao integrar: **verificar CORS** e os endpoints reais da API (listar traduções, buscar capítulo/versículo) antes de fixar; tratar erro de rede com estado honesto ("não foi possível carregar a versão agora").
- Licença: essa API é livre pro catálogo dela; ao adicionar outra fonte, conferir a licença daquela versão antes de exibir.

## Schema (meu pedaço — só isto)
- **sermon_scriptures**: id, org_id, sermon_id (fk sermons cascade), book (text — código/nome do livro), chapter (int), verse_start (int), verse_end (int nullable), reference (text — ex. "John 10:1-18"), created_at. RLS `is_org_member`. Índice (org_id, book) pro Scripture Map.
- É a relação que alimenta o **Scripture Map** (cobertura: quais livros a igreja mais pregou). Popular a partir do `main_passage` + referências reconhecidas no `content`.
- Preferência de versões padrão pra comparar pode ficar em app_state/localStorage (não precisa de tabela).

## Front (só depois de SCHEMA-READY) — inclui a visão do dono
1. **Reconhecimento de escritura**: ao editar/ver o sermão, detectar referências no texto (regex tipo "João 10:1-18", "Rm 8:28", "1Co 13") e torná-las clicáveis. Grava as passagens em sermon_scriptures.
2. **Painel de escritura**: ao clicar numa referência, abrir painel com o texto (via API), contexto, e histórico ("você já pregou sobre esta passagem": lê sermon_scriptures).
3. **Comparação (visão do dono)**: botão de busca de trecho; seletor **livro (inicial) → capítulo → versículo** (ex.: "Co 1 1:10"); comparar **múltiplas versões lado a lado, exibidas ao mesmo tempo**; copiar / adicionar ao sermão.
4. **Toggle on/off** (visão do dono): as sugestões/reconhecimento automático devem ser desligáveis.
5. **Scripture Map**: os 66 livros com intensidade por uso (de sermon_scriptures); clicar num livro → sermões que o usaram.

## Regras (DNA)
- Dados reais: cobertura vem de sermões reais; nada inventado. Estado vazio honesto.
- Conecta a sermons/Timeline. RLS: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID.
- É uma fase grande — pode fatiar (recognition+map primeiro; comparação depois) se ficar mais seguro; decida no plano.

## Depois
- /verify-app verde + validação MCP (sermon_scriptures sob RLS + rollback). Commit `feat(step5-fase3): escritura + comparação`.
