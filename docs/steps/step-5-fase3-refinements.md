# Study — refinamentos da Fase 3 (feedback do dono, ao vivo)

Depois de usar o Study ao vivo, o dono pediu ajustes. Uns são front (fazer já), outros esbarram em licença (decisão à parte).

## A. Editor canvas — ainda não está "blank" o bastante (FRONT, fazer já)
O editor ainda parece um template: 6 seções rotuladas (OUTLINE, NOTAS, ILUSTRAÇÕES, APLICAÇÃO, RESPOSTA DE ORAÇÃO) com placeholders fixos. O dono quer **o meio todo disponível, como abrir uma página do Notion**: quase em branco, largura central cheia, escrita primeiro.
- Ao abrir um sermão novo: canvas **majoritariamente vazio** — título grande + um corpo aberto pronto pra escrever, cursor já lá. Nada de 6 caixas rotuladas ocupando a tela.
- As seções (outline/notas/ilustrações/aplicação/resposta) passam a ser **estrutura opcional/leve** (blocos que o pastor adiciona ou cabeçalhos discretos), não um formulário imposto. Placeholder só some/fraco quando vazio.
- Usar **largura central cheia** (não uma coluna estreita). Sensação de documento, respiro, Poppins. Preservar todo o conteúdo do `content` jsonb.

## B. Bíblia — UX (FRONT, fazer já; funciona com o que já temos)
1. **Filtrar versões pelo idioma do usuário**: quem usa em pt-BR vê só Bíblias em português; inglês só inglês; espanhol só espanhol. NADA da lista gigante com todos os códigos de idioma do mundo (aai, aak, aau...). Detectar pelo idioma do app / preferência.
2. **Abreviação de idioma como se usa**: "PT-BR", "EN", "ES" — não "por"/"eng"/"spa".
3. **Versão escrita por extenso + abreviação**: ex. "Bíblia Livre (BLIVRE)", não só "BLJ". (Puxar o nome completo do metadado da API.)
4. **Ler a Bíblia inteira**: o pastor precisa poder ler o **capítulo/contexto inteiro**, não só o versículo isolado. Botão/painel de leitura contínua do capítulo.

## C. Versões populares (NVI, NVT, ARA, NAA, ACF) — REALIDADE DE LICENÇA (decisão, não código)
Essas são as que o pastor conhece, e **quase todas são protegidas por copyright**:
- ARA e NAA → Sociedade Bíblica do Brasil (SBB). NVI → Biblica. NVT → Mundo Cristão. ACF → Trinitariana (SBTB).
- Por isso o catálogo GRÁTIS (helloao) só traz domínio público (Bíblia Livre etc.) — as populares não estão lá de graça, legalmente.
- Caminhos legais para tê-las: **licenciar cada uma** com o detentor (SBB/Biblica/Mundo Cristão), ou via **API.Bible** (paga + permissão do editor por versão; tier grátis é não-comercial). Isso é **contrato + custo**, não programação.
- NÃO usar repositórios "grátis" de GitHub com versões copyrighted num produto comercial (risco legal).
- **Posição recomendada**: agora, entregar domínio público bem apresentado (item B) com a fonte plugável; licenciar as populares é uma **trilha de negócio** separada, quando fizer sentido comercialmente.
- **DECISÃO DO DONO (2026-07-12): confirmada esta posição** — domínio público agora, licenciar as populares depois. Manter `bible-source.js`/`isDisplayable()` como o chokepoint plugável para quando entrarem versões licenciadas.

## D. Interlinear no original (grego/hebraico) — VIÁVEL, módulo futuro
Texto original com a palavra traduzida embaixo de cada palavra, e hover → contexto (parsing/léxico). É buildável com dados abertos:
- **STEPBible-Data** (CC BY 4.0) — hebraico + grego com Strong's e morfologia, TSV. Melhor fonte única.
- **OSHB / openscriptures morphhb** (CC BY 4.0) — hebraico com morfologia + Strong's.
- **MorphGNT/SBLGNT** — grego NT com morfologia (checar EULA do SBLGNT para uso comercial).
- **Léxicos**: Strong's (domínio público) e BDB (1906, domínio público) para o hover.
- Verdadeiro módulo à parte (importar + alinhar + renderizar interlinear + léxico). Fazer depois do núcleo, com atribuição CC BY 4.0.

## Ordem sugerida
1. Refinar A (canvas mais blank) + B (UX de Bíblia: filtro por idioma, nomes+abreviação, ler capítulo inteiro) — front, agora.
2. Decidir C (licenciar populares?) — trilha de negócio, quando o dono quiser.
3. D (interlinear) — módulo futuro, com STEPBible CC BY 4.0.
