# Feature: Oração (Prayer)

Mural de oração: métricas, "Foco de Oração" (nuvem semântica), lista de pedidos e
ações (orando +1, marcar respondida, recolocar no mural). "Todo pedido visto."

## Arquivos-chave
- `domain.ts` — interface pública: `Privacy`, `PrayerRequest`, `prayerCloudData`,
  `prayerMatch`, `ansLeft`, `isPrunable`. Regras portadas 1:1 de `derived.js`.
- `queries.ts` — `listPrayers` (mapeia `prayer_requests` + nome do grupo; filtra
  os podados = respondidos há +30 dias).
- `schema.ts` — validação do novo pedido.
- `actions.ts` — `createPrayerAction`, `prayForAction`, `markAnsweredAction`,
  `restorePrayerAction` (valida → sessão/org → Supabase → revalidate).
- `components/PrayerBoard.tsx` — orquestra stats, nuvem, filtro, lista, modal.
- `components/PrayerCloud.tsx` — nuvem em espiral (layout que mede o DOM; client;
  re-layouta no resize). Consulta os nós por `[data-cw]`.
- `components/PrayerModal.tsx` — novo pedido.
- `prayer.module.css` — estilos da feature (nuvem + cards), colocados por feature.

## Tabela Supabase
- `prayer_requests` (title, author_name, request, privacy, group_id, topics[],
  praying_count, answered, answered_on, created_at).

## Rota
- `/prayer`.

## Paridade — mudanças documentadas
- **Prune físico**: o app legado APAGA a resposta 30 dias depois no render. Aqui a
  query apenas **esconde** (filtra) as podadas — o DELETE físico vira tarefa de
  manutenção (evita efeito colateral de escrita durante o render de Server Component).
  Comportamento visível idêntico (somem do mural após 30 dias); a contagem regressiva
  (`ansLeft`) segue igual.
- **"Orando (+1)"**: incremento por leitura+escrita (sem RPC atômica). A contagem é
  indicador de comunhão, não número crítico; uma RPC de incremento pode entrar depois.
- **stick_id** do pedido fica null (autor por nome, como no legado).
