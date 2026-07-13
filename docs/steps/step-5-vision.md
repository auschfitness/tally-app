# Step #5 (Study) — visão do dono (complementa o step-5.md do Notion)

Adendos do Gaybiel à spec do Study. Registrar e honrar nas fases futuras. NÃO altera a Fase 1 em curso (sermons + Library + editor) — o modelo atual (`content` jsonb) já comporta.

## 1. Ingestão de sermões externos (extensão da spec)
O pastor faz **upload** de sermões que já escreveu (PDF, docx, txt, outras extensões de texto). O app **lê/extrai** o texto e o sermão entra na biblioteca e na **memória buscável** como qualquer sermão escrito no Tally.
- Arquitetura: Supabase **Storage** (bucket privado por org) + extração de texto (client: pdf.js para PDF, mammoth para docx; ou edge function) + guardar o texto extraído (coluna/tabela) para busca/memória.
- Encaixe: rodada dedicada **"Sermon Import"**, perto da Fase 4 (Resources) / Fase 5 (Memory). Schema futuro: talvez `sermon_files` (org_id, sermon_id, storage_path, mime, extracted_text) — decidir na hora.

## 2. Recomendação contextual ao escrever = Sermon Memory (Fase 5)
Já é a §12 do doc. Enquanto o pastor escreve, o app sugere/sinaliza um **sermão passado relacionado pelo texto** (semântico).
- **Requisito do dono: toggle on/off.** A sugestão é opcional e desligável a qualquer momento.
- Inclui os sermões importados (item 1) na memória, não só os escritos no app.

## 3. Comparação bíblica prática (Fase 3)
UX pedida pelo dono:
- Botão de **busca de trecho**; navegação **livro (inicial) → capítulo → versículo** (ex.: "Co 1 1:10").
- Dentro de um texto, opção de **comparar versões lado a lado, exibidas ao mesmo tempo**.
- **Licença (crítico):** exibir livre só versões de **domínio público** (ex.: Almeida PT, KJV). ESV/NIV/etc. só via API licenciada ou material do próprio usuário. Nunca mostrar versão licenciada sem direito. Arquitetura preparada pra fontes múltiplas (domínio público, API, upload do usuário).

## 4. Módulo extra: exegese / língua original (novo, não estava no doc)
Dissecação e **leitura exegética do texto na língua original** (grego/hebraico) — morfologia, léxico. Viável com textos morfológicos de domínio público. Marcar como **módulo extra do Study**, fase futura, depois do núcleo (sermão + biblioteca + comparação).

## Resumo de encaixe nas fases
- Fase 1 (agora): sermão + biblioteca + editor. Sem mudança.
- Fase 3: comparação bíblica (com o cuidado de licença).
- Fase 4/5: Sermon Import (upload + extração) + Sermon Memory (com toggle), incluindo os importados.
- Extra: exegese em língua original.
