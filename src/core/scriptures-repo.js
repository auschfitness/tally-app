// Repositório de escrituras dos sermões (Step 5 · Fase 3a). Guarda em
// `sermon_scriptures` as referências reconhecidas em cada sermão — a relação que
// alimenta o Scripture Map (cobertura por livro) e o histórico "você já pregou
// sobre esta passagem". O TEXTO bíblico não vem daqui (é da API, sob demanda).
//
// RLS: SELECT sem filtro de org; UPSERT/DELETE com org_id = ORG_ID.
// Upsert on conflict (sermon_id, reference) → re-parsear não duplica.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function rowToScr(row) {
  return { id: row.id, sermon_id: row.sermon_id, book: row.book, chapter: row.chapter, verse_start: row.verse_start, verse_end: row.verse_end, reference: row.reference };
}

// Carrega todas as escrituras da org. Nunca rejeita.
export async function hydrateScriptures(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("sermon_scriptures").select("*");
    if (res.error) { console.warn("hydrateScriptures:", res.error.message); return; }
    st.scriptures = (res.data || []).map(rowToScr);
  } catch (e) {
    console.warn("hydrateScriptures(exceção):", e && e.message);
  }
}

// Sincroniza as referências de UM sermão: upsert das atuais + remove as que saíram.
// `refs` = saída do parser [{book, chapter, verse_start, verse_end, reference}].
export async function syncSermonScriptures(sermonId, refs) {
  try {
    if (!SB || !ORG_ID || !isUuid(sermonId)) return;
    // dedup por reference (a unique é (sermon_id, reference))
    var seen = {}, desired = [];
    (refs || []).forEach(function (r) { if (r && r.reference && !seen[r.reference]) { seen[r.reference] = 1; desired.push(r); } });

    if (desired.length) {
      var rows = desired.map(function (r) {
        return { org_id: ORG_ID, sermon_id: sermonId, book: r.book, chapter: r.chapter, verse_start: r.verse_start || null, verse_end: r.verse_end || null, reference: r.reference };
      });
      var up = await SB.from("sermon_scriptures").upsert(rows, { onConflict: "sermon_id,reference" });
      if (up.error) { console.warn("syncSermonScriptures upsert:", up.error.message); }
    }

    // remove as que não existem mais (por id, a partir do que temos em memória)
    var existing = (state.scriptures || []).filter(function (x) { return x.sermon_id === sermonId; });
    var keep = {}; desired.forEach(function (r) { keep[r.reference] = 1; });
    var toDelete = existing.filter(function (x) { return !keep[x.reference]; }).map(function (x) { return x.id; });
    if (toDelete.length) {
      var dr = await SB.from("sermon_scriptures").delete().in("id", toDelete);
      if (dr.error) { console.warn("syncSermonScriptures delete:", dr.error.message); }
    }

    // reflete no estado em memória (refetch só deste sermão)
    var res = await SB.from("sermon_scriptures").select("*").eq("sermon_id", sermonId);
    if (!res.error) {
      var others = (state.scriptures || []).filter(function (x) { return x.sermon_id !== sermonId; });
      state.scriptures = others.concat((res.data || []).map(rowToScr));
      save();
    }
  } catch (e) {
    console.warn("syncSermonScriptures(exceção):", e && e.message);
  }
}
