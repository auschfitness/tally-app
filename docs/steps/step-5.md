# TALLY — STEP 5 · STUDY: SERMON WORKSPACE, BIBLICAL RESEARCH & TEACHING LIBRARY

Colocar em `tally-app/docs/steps/step-5.md`. Fonte: caderno Notion "Tally" › #5.
Construir SOBRE o app existente. Introduz o ambiente pastoral de estudo.

Study não é um editor de texto simples. É o workspace onde pastores e mestres preparam, organizam, preservam, buscam e desenvolvem o ensino bíblico. Meta: ajudar pastores a preparar sermões melhores **preservando a memória de ensino coletiva da igreja**. Tally não substitui o estudo bíblico; organiza, conecta e lembra o trabalho do pastor.

## 1. Conceito central: STUDY
Novo módulo primário. Contém: sermões, séries, biblioteca de ensino, referências bíblicas, notas pessoais, pesquisa, ilustrações, citações, aplicações, histórico de estudo. Pergunta central: "O que Deus ensinou à nossa igreja, e como estamos nos preparando para ensinar a seguir?"

## 2. Filosofia
A Bíblia é a fundação. O pastor é o mestre. Tally é o assistente. NÃO desenhar como "a IA escreve seu sermão". A IA pode ajudar com organização, busca, memória, conexões, pesquisa, comparação, descoberta. A IA **nunca** se apresenta como autora de autoridade espiritual.

## 3. Navegação
Study › Sermons, Series, Library, Scriptures, Notes, Resources.

## 4. Sermon (entidade de primeira classe)
- **Sermon**: id, church_id, title, subtitle, description, preacher_id, series_id, date, campus, service, status, visibility, created_at, updated_at
- Status: Draft, Preparing, Ready, Preached, Archived
- Visibility: Private, Leadership, Church, Public

## 5. Estrutura de conteúdo do sermão (não é campo de texto único)
Título, Passagem principal (ex. John 10:1-18), Big Idea, Outline (introdução, pontos, sub-pontos), Notes (texto livre), Illustrations, Application, Prayer Response, References, Media.

## 6-7. Editor
Sensação de Notion/Google Docs/Logos, não Word. Layout: painel esquerdo (estrutura/outline), centro (escrita), painel direito (assistente de estudo). Outline interativo: clicar navega; reordenar, colapsar, adicionar, drag-and-drop.

## 8-11. Escritura
- **Scripture recognition**: o editor reconhece referências automaticamente (ex. "Romans 8:28" vira interativo → abre painel).
- **Scripture panel**: referência, contexto, traduções disponíveis, passagens relacionadas, histórico de sermões do próprio pastor, notas.
- **Traduções**: têm licenciamento. Arquitetura deve suportar domínio público, traduções licenciadas, APIs externas, recursos do próprio usuário. Exibir só quando legalmente disponível.
- **Comparação**: comparar traduções lado a lado (destacar diferenças, copiar, anotar, adicionar ao sermão).

## 12-13. Memória e busca
- **Sermon Memory** (feature crítica): Tally lembra tudo que o pastor já escreveu e sugere sermões/notas relacionados ao que ele está escrevendo. Abrir lado a lado.
- **Sermon Search** semântica: palavras, tópicos, escrituras, temas, séries, datas, pregadores. Ex.: buscar "fé no sofrimento" → sermões + notas + referências.

## 14-15. Biblioteca
- **Sermon Library** visual (cards, timeline, coleções de série), com filtros (série, livro da Bíblia, tópico, pregador, ano, campus).
- **Scripture Coverage / Scripture Map**: os 66 livros com intensidade por uso em sermões (mostra a história de ensino da igreja). Clicar num livro → sermões, passagens mais usadas, mais recente, temas.

## 16-17. Séries
- **Series** (entidade): id, title, description, theme, cover_image, start_date, end_date, sermons, status.
- Planejamento de série: visão, tema, escrituras-chave, cronograma, rascunhos, concluídos, recursos.

## 18-20. Teaching / Notes / Resources
- **Teaching**: ecossistema educacional mais amplo (classes, cursos, estudos bíblicos, material de discipulado, currículo). Um sermão pode virar material de ensino; conecta a Sermons, Scriptures, Groups, Journey.
- **Notes Library**: notas pessoais/compartilhadas, ilustrações, citações, referências — cada nota conecta a escritura/sermão/série/tópico.
- **Resource Library**: livros, artigos, PDFs, links, docs, vídeos, citações, com metadados.

## 21. IA (futuro, como suporte)
Sermon memory, conexão de temas, conexões de escritura, organização (notas→outline), pesquisa, citação. A IA nunca escreve teologia automaticamente, nunca gera sermão substituindo o estudo, nunca reivindica insight divino.

## 22. Conexões com outros módulos
Services (um sermão é pregado num culto), Journey (uma trilha de ensino move pessoas), Groups (usam material), Sticks (participação em ensino aparece na Timeline), Signals, Insights.

## 24. Design visual
Focado, quieto, premium, criativo, reflexivo. Evitar dashboards ocupados. Área de escrita grande, tipografia elegante, mínimas distrações, ferramentas contextuais quando necessário.

## 25. ORDEM DE IMPLEMENTAÇÃO (as 6 fases)
- **Fase 1**: navegação Study; entidade Sermon; Sermon Library; editor básico.
- **Fase 2**: Series; conectar sermões.
- **Fase 3**: reconhecimento de escritura; painel de escritura.
- **Fase 4**: Notes e Resources.
- **Fase 5**: busca semântica; sermon memory.
- **Fase 6**: conexões de Teaching; ligar Study a Journey, Groups, Services.

## 26. DEFINITION OF DONE
Study é módulo central; pastores escrevem sermões no Tally; sermões são registros estruturados e buscáveis; Sermon Library existe; gestão de Series; referências de escritura conectam a sermões; arquitetura de comparação de Bíblia existe; sermões anteriores são descobríveis; recursos de ensino armazenáveis; Study conecta ao resto do Church OS; IA desenhada como suporte, não substituição.
