# Handoff Supabase — feature Home (/) — a última tela

> Orquestrador → Claude Code. Confirmado via MCP, 2026-07-14. **Sem tabela/view/RPC nova.**

## Veredito: Home é agregação pura no app. Fazer POR ÚLTIMO.
Home junta tudo (pessoas, grupos, cultos, eventos, escala, care, signals, journey, finanças).
Como Calendar, **não há** view/RPC de agregação no banco (confirmado: nenhuma view; só as 5
funções de RLS). A Home projeta o que as features já migradas retornam + a saída do **Signals
engine**.

## Regras
- **Reuse as queries de feature já prontas** e o `signals(input, now)` do engine — não vá
  direto às tabelas nem recalcule nada por conta própria. Isso preserva RLS, `archived` e
  `campus` já corretos nas fontes.
- Home **depende do Signals engine** (pronto) + de TODAS as fontes migradas. Só dá para fazer
  quando Care e Inbox estiverem prontos (ela mostra o topo do que aparece neles).
- Cuidado com custo: Home dispara muitas leituras. Faça no RSC (server), em paralelo
  (`Promise.all`) e sem N+1. Se ficar pesado com volume real, dá para pensar numa RPC de
  resumo — **ação minha**, me peça; por ora, camada de app.

## O que a Home mostra (do legado — confirmar em `src/views/home.js`)
Pulse da igreja: pessoas que podem precisar de atenção (via engine), presença recente,
próximos cultos/eventos, escala da semana, itens de Care abertos, aniversários/milestones.
Tudo isso vem das fontes; a Home só seleciona/ordena o topo. Sem lógica de banco nova.

## `app_state` (blob) — sub-campos que a Home pode tocar
Alguns dados ainda vivem no blob `app_state.data` (ver handoff de Settings). Se a Home ler
algo de lá (ex.: config de instituição), leia sem reescrever. Escrita no blob só com
read-modify-write cirúrgico.

— fim.
