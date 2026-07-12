// Repositório da entidade Prayer (pedidos de oração) na tabela relacional
// `prayer_requests`. Fase 2 — migra a LEITURA e a ESCRITA de TODOS os campos
// do pedido (inclusive `title`, coluna já criada no Supabase).
//
// Cuidados (mesmos de sticks-repo/groups-repo, aprovados):
//  1. RLS x org_id: SELECT sem filtro de org (o RLS filtra); INSERT/UPDATE com
//     org_id = ORG_ID explícito (coluna NOT NULL, sem default).
//  2. Grupo: o app guarda o grupo por NOME; resolvemos para group_id procurando
//     em `groups`. Se não achar, group_id = null (coluna nullable). Nunca inventar id.
//  3. Id: o uuid é gerado pelo banco. Ao criar, adotamos o uuid RETORNADO como
//     id do pedido no state.
//  4. created_at: em pedidos novos deixamos o default (now()) do banco; no
//     backfill de pedidos antigos preservamos a data setando created_at = p.date.
//  5. stick_id fica null (author_name já cobre o autor); casar por nome é rodada futura.

import { SB, ORG_ID } from "./session.js";
import { save } from "./persist.js";

const PRIV_ALLOWED = ["church", "group", "leader", "private"];
function privOr(v) { return PRIV_ALLOWED.indexOf(v) >= 0 ? v : "church"; }
function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

// Mapa nome<->id de grupos (RLS filtra por org). Não cria grupo aqui: se o nome
// não existir na tabela, o pedido fica com group_id null (sem inventar id).
async function groupMaps() {
  const gs = await SB.from("groups").select("id,name");
  const byName = {}, byId = {};
  (gs.data || []).forEach(g => { byName[g.name] = g.id; byId[g.id] = g.name; });
  return { byName, byId };
}

// linha da tabela -> objeto pedido do app
function rowToPrayer(row, maps) {
  return {
    id: row.id,
    title: row.title || "",
    author: row.author_name || "Anônimo",
    request: row.request || "",
    privacy: row.privacy || "church",
    group: maps.byId[row.group_id] || "",
    topics: row.topics || [],
    praying: row.praying_count || 0,
    answered: !!row.answered,
    answeredDate: row.answered_on || null,
    date: (row.created_at || "").slice(0, 10),
  };
}

// objeto pedido -> linha da tabela. `createdAt` só é setado no backfill (para
// preservar a data do pedido antigo); em pedido novo deixamos o default do banco.
function prayerToRow(p, groupId, createdAt) {
  const row = {
    org_id: ORG_ID,
    title: p.title || null,
    author_name: p.author || null,
    request: p.request || "",
    topics: p.topics || [],
    privacy: privOr(p.privacy),
    group_id: groupId,
    praying_count: p.praying || 0,
    answered: !!p.answered,
    answered_on: p.answeredDate || null,
  };
  if (createdAt) row.created_at = createdAt;
  return row;
}

// Cria/atualiza o pedido na tabela. Devolve o id definitivo (uuid do banco no
// caso de criação). Sem login, é no-op (devolve o id atual).
export async function upsertPrayer(p, createdAt) {
  if (!SB || !ORG_ID) return p.id;
  const maps = await groupMaps();
  const groupId = maps.byName[p.group] || null;
  const row = prayerToRow(p, groupId, createdAt);
  if (isUuid(p.id)) {
    const { error } = await SB.from("prayer_requests").update(row).eq("id", p.id);
    if (error) console.warn("upsertPrayer(update):", error.message);
    return p.id;
  }
  const { data, error } = await SB.from("prayer_requests").insert(row).select("id").single();
  if (error || !data) { console.warn("upsertPrayer(insert):", error && error.message); return p.id; }
  return data.id; // uuid do banco vira o id do pedido
}

// Remove o pedido da tabela (usado pelo prune de respondidas com +30 dias).
export async function deletePrayer(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("prayer_requests").delete().eq("id", id);
  if (error) console.warn("deletePrayer:", error.message);
}

// Carrega os pedidos da tabela para o state. Se a tabela estiver vazia e o
// app_state tiver pedidos (org anterior ao relacional), faz backfill: sobe pra
// tabela preservando a data e adota os uuids. Nunca rejeita.
export async function hydratePrayers(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await groupMaps();
    const res = await SB.from("prayer_requests").select("*");
    if (res.error) { console.warn("hydratePrayers:", res.error.message); return; }
    const rows = res.data || [];
    const prev = st.prayers || [];

    if (rows.length === 0 && prev.length > 0) {
      // backfill do app_state -> tabela, preservando a data e adotando os uuids
      const migrated = [];
      for (const p of prev) {
        const newId = await upsertPrayer(p, p.date || null);
        migrated.push(Object.assign({}, p, { id: newId }));
      }
      st.prayers = migrated;
      save(); // persiste os uuids no app_state
      return;
    }

    st.prayers = rows.map(row => rowToPrayer(row, maps));
  } catch (e) {
    console.warn("hydratePrayers(exceção):", e && e.message);
  }
}
