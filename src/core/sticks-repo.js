// Repositório da entidade Sticks (pessoas) na tabela relacional `sticks`.
// Fase 2 — migra a LEITURA e a ESCRITA dos campos PRÓPRIOS da pessoa.
//
// Cuidados (aprovados):
//  1. RLS x org_id: SELECT sem filtro de org (o RLS filtra); INSERT/UPSERT com
//     org_id = ORG_ID explícito (coluna NOT NULL, sem default).
//  2. Id: o uuid é gerado pelo banco. Ao criar, adotamos o uuid RETORNADO como
//     o id da pessoa no state/app_state — é o que mantém grupo/milestones/
//     household (que seguem no app_state, casados por id) apontando certo.
//  3. Enum: relationship_status bate 1:1 com o app (conferido no banco); mesmo
//     assim há um fallback seguro (nunca inventar valor novo).
//
// Ficam no app_state por ora (outras entidades, migração própria):
//   group, milestones[], household, journeyStage.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";
import { JOURNEY } from "./helpers.js";

const REL_ALLOWED = ["visitor_first", "visitor_returning", "attendee", "member", "inactive"];
function relOr(v) { return REL_ALLOWED.indexOf(v) >= 0 ? v : "member"; }
function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

// Mapas nome<->id de campus e journey (carregados sob demanda; RLS filtra por org)
async function refMaps() {
  const [camps, stages] = await Promise.all([
    SB.from("campuses").select("id,name"),
    SB.from("journey_stages").select("id,position"),
  ]);
  const campusByName = {}, campusById = {}, stageByPos = {}, posById = {};
  (camps.data || []).forEach(c => { campusByName[c.name] = c.id; campusById[c.id] = c.name; });
  (stages.data || []).forEach(s => { stageByPos[s.position] = s.id; posById[s.id] = s.position; });
  return { campusByName, campusById, stageByPos, posById };
}

// Garante uma linha em `campuses` para o nome (campus adicionado nas Configurações
// só existia no app_state). Devolve o id ou null.
async function ensureCampusId(name, maps) {
  if (!name) return null;
  if (maps.campusByName[name]) return maps.campusByName[name];
  const { data, error } = await SB.from("campuses").insert({ org_id: ORG_ID, name: name }).select("id").single();
  if (error || !data) return null;
  maps.campusByName[name] = data.id; maps.campusById[data.id] = name;
  return data.id;
}

// linha da tabela -> objeto pessoa do app (campos próprios; sub-campos vazios,
// preenchidos depois pelo merge com o app_state)
function rowToPerson(row, maps) {
  const pos = maps.posById[row.journey_stage_id];
  const person = {
    id: row.id,
    name: row.full_name,
    relationship: row.relationship_status,
    roles: row.is_leader ? ["leader"] : [],
    campus: maps.campusById[row.primary_campus_id] || "",
    lastSeen: row.last_seen_at || "",
    followup: !!row.followup_open,
    firstVisit: row.first_visit_date || "",
    source: row.source || "",
    journeyStage: pos ? JOURNEY[pos - 1][0] : "first_visit",
    archived: !!row.archived,
    group: "", milestones: [], household: "",
  };
  if (row.birth_date) person.birthDate = row.birth_date;
  return person;
}

// objeto pessoa -> linha da tabela (só os campos próprios)
function personToRow(p, campusId) {
  return {
    org_id: ORG_ID,
    full_name: p.name,
    relationship_status: relOr(p.relationship),
    is_leader: (p.roles || []).indexOf("leader") >= 0,
    primary_campus_id: campusId,
    last_seen_at: p.lastSeen || null,
    followup_open: !!p.followup,
    first_visit_date: p.firstVisit || null,
    source: p.source || null,
    birth_date: p.birthDate || null,
    archived: !!p.archived,
  };
}

// Cria/atualiza a pessoa na tabela. Devolve o id definitivo (uuid do banco no
// caso de criação). Sem login, é no-op (devolve o id atual).
export async function upsertStick(p) {
  if (!SB || !ORG_ID) return p.id;
  const maps = await refMaps();
  const campusId = await ensureCampusId(p.campus, maps);
  const row = personToRow(p, campusId);
  if (isUuid(p.id)) {
    const { error } = await SB.from("sticks").update(row).eq("id", p.id);
    if (error) console.warn("upsertStick(update):", error.message);
    return p.id;
  }
  const { data, error } = await SB.from("sticks").insert(row).select("id").single();
  if (error || !data) { console.warn("upsertStick(insert):", error && error.message); return p.id; }
  return data.id; // uuid do banco vira o id da pessoa
}

// Arquiva (soft delete) na tabela.
export async function archiveStick(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("sticks").update({ archived: true }).eq("id", id);
  if (error) console.warn("archiveStick:", error.message);
}

// Carrega as pessoas da tabela para o state, mesclando os sub-campos (group/
// milestones/household) que continuam no app_state, casados por id. Se a tabela
// estiver vazia e o app_state tiver pessoas (org anterior ao relacional), faz
// backfill: sobe pra tabela e adota os uuids. Nunca rejeita.
export async function hydratePeople(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await refMaps();
    const res = await SB.from("sticks").select("*").eq("archived", false);
    if (res.error) { console.warn("hydratePeople:", res.error.message); return; }
    const rows = res.data || [];
    const prev = st.people || [];
    const subById = {};
    prev.forEach(p => { subById[p.id] = { group: p.group || "", milestones: p.milestones || [], household: p.household || "" }; });

    if (rows.length === 0 && prev.length > 0) {
      // backfill do app_state -> tabela, adotando os uuids
      const migrated = [];
      for (const p of prev) {
        if (p.archived) continue;
        const newId = await upsertStick(p);
        migrated.push(Object.assign({}, p, { id: newId }));
      }
      st.people = migrated;
      save(); // persiste os uuids + sub-campos no app_state
      return;
    }

    st.people = rows.map(row => {
      const person = rowToPerson(row, maps);
      const sub = subById[row.id];
      if (sub) { person.group = sub.group; person.milestones = sub.milestones; person.household = sub.household; }
      return person;
    });
  } catch (e) {
    console.warn("hydratePeople(exceção):", e && e.message);
  }
}
