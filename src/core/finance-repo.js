// Repositório da entidade Finance (lançamentos) na tabela relacional
// `finance_entries`. Fase 2 — escopo desta rodada: SÓ finance_entries.
//   - Categoria e Fundo vão DENORMALIZADOS em texto (category_name / fund_name);
//     category_id e fund_id ficam NULL (normalizar em funds/finance_categories
//     é rodada futura — mesmo princípio de deixar relações pra depois).
//   - Campus é resolvido nome<->campus_id em `campuses` (entidade já relacional,
//     mesmo padrão do sticks-repo) porque a view filtra por campus.
//
// Cuidados (mesmos de sticks/groups/prayer-repo, aprovados):
//  1. RLS x org_id: SELECT sem filtro de org; INSERT/UPDATE com org_id = ORG_ID.
//  2. Id: uuid do banco; ao criar, adota o uuid RETORNADO como id no state.
//  3. type é enum {in,out} — bate 1:1 com o app; fallback seguro, nunca inventar.
//  4. amount é numeric — coage para número (sem símbolo de moeda/separador de milhar).
//  5. entry_date é NOT NULL — mapeia e.date; no backfill preserva created_at = e.date.

import { SB, ORG_ID } from "./session.js";
import { save } from "./persist.js";

const TYPE_ALLOWED = ["in", "out"];
function typeOr(v) { return TYPE_ALLOWED.indexOf(v) >= 0 ? v : "in"; }
function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

// Garante que amount vira número limpo (sem R$, sem separador de milhar).
function numOr(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v == null ? "" : v).replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
}

// Mapa nome<->id de campus (RLS filtra por org). Cria o campus se o nome não
// existir (igual sticks-repo), para o lançamento não perder o campus no round-trip.
async function campusMaps() {
  const camps = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (camps.data || []).forEach(c => { byName[c.name] = c.id; byId[c.id] = c.name; });
  return { byName, byId };
}
async function ensureCampusId(name, maps) {
  if (!name) return null;
  if (maps.byName[name]) return maps.byName[name];
  const { data, error } = await SB.from("campuses").insert({ org_id: ORG_ID, name: name }).select("id").single();
  if (error || !data) return null;
  maps.byName[name] = data.id; maps.byId[data.id] = name;
  return data.id;
}

// linha da tabela -> objeto lançamento do app
function rowToEntry(row, maps) {
  return {
    id: row.id,
    type: row.type,
    desc: row.description || "",
    cat: row.category_name || "",
    fund: row.fund_name || "",
    amount: numOr(row.amount),
    date: row.entry_date || "",
    campus: maps.byId[row.campus_id] || "",
  };
}

// objeto lançamento -> linha da tabela. `createdAt` só no backfill (preserva a data).
function entryToRow(e, campusId, createdAt) {
  const row = {
    org_id: ORG_ID,
    type: typeOr(e.type),
    description: e.desc || "",
    category_name: e.cat || null,
    category_id: null,
    fund_name: e.fund || null,
    fund_id: null,
    amount: numOr(e.amount),
    campus_id: campusId,
  };
  if (e.date) row.entry_date = e.date; // senão cai no default (CURRENT_DATE)
  if (createdAt) row.created_at = createdAt;
  return row;
}

// Cria/atualiza o lançamento na tabela. Devolve o id definitivo (uuid do banco
// no caso de criação). Sem login, é no-op (devolve o id atual).
export async function upsertEntry(e, createdAt) {
  if (!SB || !ORG_ID) return e.id;
  const maps = await campusMaps();
  const campusId = await ensureCampusId(e.campus, maps);
  const row = entryToRow(e, campusId, createdAt);
  if (isUuid(e.id)) {
    const { error } = await SB.from("finance_entries").update(row).eq("id", e.id);
    if (error) console.warn("upsertEntry(update):", error.message);
    return e.id;
  }
  const { data, error } = await SB.from("finance_entries").insert(row).select("id").single();
  if (error || !data) { console.warn("upsertEntry(insert):", error && error.message); return e.id; }
  return data.id; // uuid do banco vira o id do lançamento
}

// Remove o lançamento da tabela (botão × na lista).
export async function deleteEntry(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("finance_entries").delete().eq("id", id);
  if (error) console.warn("deleteEntry:", error.message);
}

// Carrega os lançamentos da tabela para o state. Se a tabela estiver vazia e o
// app_state tiver lançamentos (org anterior ao relacional), faz backfill: sobe
// pra tabela preservando a data e adota os uuids. Nunca rejeita.
export async function hydrateEntries(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("finance_entries").select("*");
    if (res.error) { console.warn("hydrateEntries:", res.error.message); return; }
    const rows = res.data || [];
    const prev = st.entries || [];

    if (rows.length === 0 && prev.length > 0) {
      // backfill do app_state -> tabela, preservando a data e adotando os uuids
      const migrated = [];
      for (const e of prev) {
        const newId = await upsertEntry(e, e.date || null);
        migrated.push(Object.assign({}, e, { id: newId }));
      }
      st.entries = migrated;
      save(); // persiste os uuids no app_state
      return;
    }

    st.entries = rows.map(row => rowToEntry(row, maps));
  } catch (e) {
    console.warn("hydrateEntries(exceção):", e && e.message);
  }
}
