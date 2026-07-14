# Tally — Princípios de Design (norte de UI/UX)

Este documento GOVERNA toda tela nova ou alterada. Se um design conflita com aqui, aqui vence.
Norte: **padrão macOS — simples porque é muito bem feito.** Uma pessoa ocupada, não-técnica (um pastor na segunda de manhã) tem que usar sem manual. A referência de facilidade é o ChatGPT.

## O que "simples como o ChatGPT" significa aqui
O Tally é um Church OS com muitos módulos — não vai ser uma tela só, e não deve tentar ser. A simplicidade é **por tarefa**: cada tela deve parecer tão focada quanto aquela caixa única do ChatGPT. Uma coisa clara pra fazer; o resto, escondido até ser preciso. (O canvas do Study é o modelo: escrita como estrela, metadados num drawer.)

## Princípios (valem pra toda tela)
1. **Uma ação primária por tela.** Ela é a mais visível. Ações secundárias ficam recolhidas (menu "...", drawer, aba). Nunca competir três botões pelo mesmo peso.
2. **Revelação progressiva.** Avançado/config fica atrás de "Propriedades", "...", drawers. A tela abre no estado mais simples possível.
3. **Defaults inteligentes.** A pessoa quase nunca precisa configurar. O app já vem funcionando (ex.: journey e seções padrão). Pergunte o mínimo.
4. **Estado vazio ensina.** Tela sem dado guia a PRIMEIRA ação ("Crie seu primeiro time"), não só "nada aqui". Sempre com um caminho claro.
5. **Consistência.** Um card sempre abre detalhe; um "+" sempre adiciona; um chip sempre filtra. A pessoa aprende um padrão e ele vale em todo lugar.
6. **Linguagem humana, PT-BR.** Sem jargão técnico, sem inglês vazando (exceto os termos de produto do CLAUDE.md). Voz madura, calma, prática — nada de "Amém! Relatório pronto!".
7. **Ar no lugar de caixas.** Hierarquia por tipografia e espaçamento, não por bordas e cartões. Superfícies quietas. Muito respiro.
8. **Cor contida.** Neutros dominam; o azul (#2B5CE6) é ACENTO — ação primária, seleção, link. Cor não é decoração; carrega significado.

## Linguagem visual (macOS-grade)
- **Tipografia lidera** a hierarquia (tamanho/peso), não bordas. Poppins.
- **Superfícies quietas**: fundo calmo, cartões sutis (sombra leve/leve elevação), poucas linhas divisórias. Preferir espaçamento a borda.
- **Cantos arredondados** consistentes; **profundidade suave** (sombra/blur discretos), nunca borda grossa.
- **Alinhamento disciplinado**: grid consistente, margens iguais, nada "quase alinhado".
- **Controles nativos sempre estilizados** ao tema (inputs, selects, checkboxes) — no claro E no escuro. Um `<select>` ou input cru (fundo branco no dark) é bug de acabamento, não aceitar.
- **Densidade organizada**: informação suficiente, sem tabelão. Se uma tela tem muitos filtros/chips visíveis de uma vez, recolher.

## Movimento (base agora; coreografia depois)
Movimento é **função**, não enfeite: comunica causa/efeito, de onde veio, o que mudou. Mas amplifica a estrutura — só animar tela cuja hierarquia já está certa.
- **Tokens compartilhados**: duração 120–240ms (micro 120–160, painéis 200–240), easing `cubic-bezier(.2,.8,.2,1)` (saída suave). Definir uma vez, reusar.
- **Onde aplicar (base)**: hover/press de botões e cards, abrir/fechar de modal e drawer (fade + leve slide/scale), troca de aba, entrada de itens de lista, transição de view.
- **Respeitar `prefers-reduced-motion`**: reduzir/desligar para quem pede.
- **Sem movimento gratuito**: nada que distraia, pisque ou atrase o uso. Se não comunica nada, não anima.
- **Coreografia rica** (transições de elemento compartilhado, física de mola) fica pra passada de polimento final.

## Checklist "esta tela está pronta?"
- [ ] Ação primária óbvia; secundárias recolhidas.
- [ ] Abre no estado mais simples; avançado escondido.
- [ ] Estado vazio ensina a 1ª ação.
- [ ] Controles estilizados ao tema, claro E escuro (nada cru).
- [ ] Linguagem PT-BR, humana; sem inglês vazando.
- [ ] Padrões consistentes com o resto do app (card→detalhe, +→adiciona).
- [ ] Movimento base aplicado (hover, modal/drawer, aba) e respeita reduced-motion.
- [ ] Ar suficiente; sem poluição de bordas/chips/filtros simultâneos.

## O que evitar
Cara de dashboard corporativo/planilha; software de RH; muitos controles visíveis ao mesmo tempo; bordas grossas e cartões pesados; cor como decoração; jargão; native controls sem estilo; três ações competindo pelo mesmo peso.
