// Repositório da entidade Groups na tabela relacional `groups`.
// Fase 2 — migra APENAS as colunas PRÓPRIAS do grupo:
//   name, campus (-> campus_id), day (-> meeting_day), time (-> meeting_time), archived.
//
// Ficam no app_state por ora (relação group_members é rodada própria, fonte única):
//   leader (líder) e a associação de MEMBROS (p.group na Stick).
//   -> `leader` é sub-campo, casado por id do grupo (igual group/milestones/household nas Sticks).
//
// Cuidados (mesmos do sticks-repo, aprovados):
//  1. RLS x org_id: SELECT sem filtro de org (o RLS filtra); INSERT/UPDATE com
//     org_id = ORG_ID explícito (coluna NOT NULL, sem default).
//  2. Campus: o app guarda o campus por NOME; resolvemos para campus_id procurando
//     em `campuses`. Se não achar, campus_id = null (coluna nullable). Nunca inventar id.
//  3. Id: o uuid é gerado pelo banco. Ao criar, adotamos o uuid RETORNADO como id do
//     grupo no state. Os MEMBROS casam por NOME (p.group === g.name), então trocar o
//     id do grupo para uuid NÃO quebra o casamento de membros.

import { SB, ORG_ID } from "./session.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

// Mapa nome<->id de campus (RLS filtra por org). Não cria campus aqui: se o nome
// não existir na tabela, o grupo fica com campus_id null (sem inventar id).
async function campusMaps() {
  const camps = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (camps.data || []).forEach(c => { byName[c.name] = c.id; byId[c.id] = c.name; });
  return { byName, byId };
}

// linha da tabela -> objeto grupo do app (leader vazio; preenchido depois pelo
// merge com o app_state)
function rowToGroup(row, maps) {
  return {
    id: row.id,
    name: row.name,
    campus: maps.byId[row.campus_id] || "",
    day: row.meeting_day || "",
    time: row.meeting_time || "",
    leader: "",
    archived: !!row.archived,
  };
}

// objeto grupo -> linha da tabela (só as colunas próprias)
function groupToRow(g, campusId) {
  return {
    org_id: ORG_ID,
    name: g.name,
    campus_id: campusId,
    meeting_day: g.day || null,
    meeting_time: g.time || null,
    archived: !!g.archived,
  };
}

// Cria/atualiza o grupo na tabela. Devolve o id definitivo (uuid do banco no caso
// de criação). Sem login, é no-op (devolve o id atual).
export async function upsertGroup(g) {
  if (!SB || !ORG_ID) return g.id;
  const maps = await campusMaps();
  const campusId = maps.byName[g.campus] || null;
  const row = groupToRow(g, campusId);
  if (isUuid(g.id)) {
    const { error } = await SB.from("groups").update(row).eq("id", g.id);
    if (error) console.warn("upsertGroup(update):", error.message);
    return g.id;
  }
  const { data, error } = await SB.from("groups").insert(row).select("id").single();
  if (error || !data) { console.warn("upsertGroup(insert):", error && error.message); return g.id; }
  return data.id; // uuid do banco vira o id do grupo
}

// Arquiva (soft delete) na tabela.
export async function archiveGroup(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("groups").update({ archived: true }).eq("id", id);
  if (error) console.warn("archiveGroup:", error.message);
}

// Carrega os grupos da tabela para o state, mesclando o sub-campo `leader` que
// continua no app_state, casado por id. Se a tabela estiver vazia e o app_state
// tiver grupos (org anterior ao relacional), faz backfill: sobe pra tabela e
// adota os uuids. Nunca rejeita.
export async function hydrateGroups(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("groups").select("*").eq("archived", false);
    if (res.error) { console.warn("hydrateGroups:", res.error.message); return; }
    const rows = res.data || [];
    const prev = st.groups || [];
    const subById = {};
    prev.forEach(g => { subById[g.id] = { leader: g.leader || "" }; });

    if (rows.length === 0 && prev.length > 0) {
      // backfill do app_state -> tabela, adotando os uuids
      const migrated = [];
      for (const g of prev) {
        if (g.archived) continue;
        const newId = await upsertGroup(g);
        migrated.push(Object.assign({}, g, { id: newId }));
      }
      st.groups = migrated;
      save(); // persiste os uuids + sub-campo leader no app_state
      return;
    }

    st.groups = rows.map(row => {
      const g = rowToGroup(row, maps);
      const sub = subById[row.id];
      if (sub) { g.leader = sub.leader; }
      return g;
    });
  } catch (e) {
    console.warn("hydrateGroups(exceção):", e && e.message);
  }
}
