# Spec 03 — Escalas (FASE 1, paralelo)

Escopo: `src/features/teams/**`, `src/app/(dashboard)/teams/**`.

## Situação

1899 linhas. Times, ministérios, membros de time e uma tela de escala. A estrutura existe;
o fluxo é que não fecha.

## Por que este módulo importa mais que os outros

É o único do Tally com **dor semanal, óbvia e demonstrável em três minutos**. Todo líder de
louvor sofre na quinta-feira montando escala no WhatsApp. É a cunha comercial do produto:
o que faz o pastor entender o valor antes de ver o resto.

Trate como vitrine, não como módulo secundário.

## O fluxo que precisa existir

Hoje falta o ciclo fechado. O caminho completo é:

1. **Montar** a escala do culto — arrastar pessoa para função dentro do time.
2. **Detectar conflito na hora**: mesma pessoa em dois times no mesmo horário, pessoa que
   marcou indisponibilidade, pessoa escalada 4 domingos seguidos. Aviso inline, não erro
   depois de salvar.
3. **Convidar** — a pessoa recebe e responde **Confirmo / Não posso** em um toque, sem
   login se possível (link com token, como `app/convite/[token]` já faz).
4. **Acompanhar** — o líder vê, por posição, quem confirmou, quem recusou, quem não
   respondeu. Cor não; ponto e texto (padrão da Fase 0).
5. **Cobrir** — recusou, o líder vê na hora quem mais faz aquela função e está livre.
6. **Lembrar** — automático, 48h e 12h antes.

Falta 2, 3, 5 e 6. É aí que está o trabalho.

## Peças de dado

- **Indisponibilidade**: `team_unavailability` (stick_id, from, to, motivo). Sem isso a
  escala é chute e o líder volta pro WhatsApp.
- **Função dentro do time**: vocal, guitarra, bateria, mesa de som, projeção. Uma pessoa
  tem N funções com nível (aprendendo / apto / referência). A escala se monta por função,
  não por nome — é assim que o líder pensa.
- **Rodízio**: quantas vezes cada pessoa serviu nos últimos 90 dias, visível ao montar.
  Evita queimar o voluntário fiel, que é o motivo número um de gente largar o ministério.
- **Repertório** ligado ao culto: música, tom, link, e o histórico de quando foi tocada
  pela última vez.

## Interface

A tela de escala é uma grade: linhas são funções, colunas são as datas do mês. Célula
vazia = vaga aberta. Vaga aberta precisa saltar aos olhos sem usar vermelho — use
contorno tracejado e o rótulo "vaga".

Visão do voluntário é outra tela e é simples: "onde eu sirvo nos próximos 30 dias",
com botão de confirmar e de avisar indisponibilidade. A maioria dos usuários do Tally vai
ser voluntário, e essa é a única tela que eles abrem. Trate-a com o mesmo cuidado da
tela do pastor.

## Flag

```
teams.v2
```

## Pronto quando

- [ ] conflito de escala é detectado antes de salvar
- [ ] convite por link responde sem exigir login
- [ ] líder vê confirmado / recusado / sem resposta por posição
- [ ] contador de rodízio de 90 dias aparece ao escalar
- [ ] tela do voluntário funciona bem no celular (testar em 360px)
- [ ] `npm run verify` verde
