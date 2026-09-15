# Spec 04 — Células (FASE 1, paralelo)

Escopo: `src/features/groups/**`, `src/app/(dashboard)/groups/**`.

## Situação

619 linhas. Lista de grupos, membros, um modal de criação. É cadastro, não gestão.

## O que a igreja brasileira espera de "célula"

Igreja com modelo celular é obcecada por três números: **presença**, **visitante** e
**multiplicação**. São a métrica que o pastor de rede olha toda semana. Hoje o módulo não
entrega nenhum dos três.

## Relatório de célula — o coração do módulo

O líder preenche depois do encontro, no celular, em menos de um minuto:

- data e se houve encontro
- presentes (lista com toque, não digitação)
- visitantes (nome e telefone, criando Stick automaticamente — DNA #1: tudo vira Stick)
- decisões e pedidos de oração
- observação livre

`group_meetings` e `group_meeting_attendance`. Cada relatório gera `timeline_events` para
cada presente e alimenta os Signals de quem faltou seguido — é o que liga o módulo ao resto
do Tally em vez de deixá-lo isolado (DNA #1).

## Rede e multiplicação

Célula tem hierarquia: célula → supervisão → setor → rede. Adicione `parent_group_id` e
trate como árvore. O pastor de rede precisa ver a árvore inteira e somar presença por ramo.

Multiplicação: uma célula gera outra, guardando a origem. `parent_group_id` mais
`multiplied_at`. A árvore de multiplicação é a coisa de que a liderança mais se orgulha —
mostre com destaque.

## Personalização

Cada igreja chama diferente: célula, pequeno grupo, GC, conexão, casa de paz, discipulado.
Rótulo configurável em `settings`, por org, e usado em toda a UI do módulo. Custa pouco e
faz a igreja sentir que o sistema é dela.

Também configurável: dia e horário padrão, o que o relatório pede (algumas igrejas querem
oferta da célula, outras não), e meta de multiplicação.

## Telas

- **Lista** com filtro por rede/supervisão, status de saúde e pendência de relatório.
- **Célula** com membros, histórico de encontros, gráfico de presença e árvore de filhas.
- **Relatório** otimizado para celular — um polegar, menos de um minuto.
- **Painel de rede** para o supervisor: quais células não entregaram relatório esta semana,
  presença por ramo, visitantes do mês.

Saúde da célula sem semáforo e sem score (DNA #3). Use frase com contexto: "sem relatório
há 3 semanas", "presença caiu de 12 para 6", "4 visitantes este mês".

## Flag

```
groups.v2
```

## Pronto quando

- [ ] relatório enviado do celular em menos de um minuto
- [ ] visitante vira Stick automaticamente
- [ ] árvore de rede e de multiplicação navegável
- [ ] rótulo configurável aplicado em toda a UI do módulo
- [ ] painel de rede mostra quem não entregou relatório
- [ ] `npm run verify` verde
