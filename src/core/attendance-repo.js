// Repositório da entidade Attendance (presença) nas tabelas relacionais
// `attendance_sessions` (a sessão) + `attendance_records` (1 linha por presente).
// Fase 2. Uma sessão do app vira uma linha em attendance_sessions e N linhas em
// attendance_records (status='present'), uma por Stick presente.
//
// Cuidados (aprovados nesta rodada):
//  1. RLS x org_id: SELECT sem filtro de org. attendance_sessions.INSERT com
//     org_id = ORG_ID explícito (org_id, context_type e session_date são NOT NULL).
//     attendance_records NÃO tem org_id — o isolamento herda da sessão-pai (RLS
//     via session_id); por isso o record só grava apontando pra uma session da org.
//  2. Id: uuid do banco; ao criar a sessão, adota o uuid RETORNADO como id no state.
//  3. context_type: check-in sem grupo -> 'service'; com grupo -> 'group' + context_id
//     (id do grupo). Nunca inventar valor de enum.
//  4. attendance_records.stick_id é FK NOT NULL -> só grava attendees que são Sticks
//     VÁLIDOS (existem na tabela). Attendee órfão (id antigo) é pulado com aviso.
//  5. source é NOT NULL: 'checkin' no check-in ao vivo, 'migration' no backfill.
//  6. session_date NOT NULL: mapeia s.date; no backfill preserva created_at = s.date.

import { SB, ORG_ID } from "./session.js";
import { save } from "./persist.js";

const CTX_ALLOWED = ["service", "group", "event", "teaching"];
function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

// Mapas nome<->id de campus e grupo (RLS filtra por org). Cria o campus se faltar
// (igual sticks/finance), para a sessão não perder o campus no round-trip.
async function refMaps() {
  const [camps, grps] = await Promise.all([
    SB.from("campuses").select("id,name"),
    SB.from("groups").select("id,name"),
  ]);
  const campusByName = {}, campusById = {}, groupByName = {}, groupById = {};
  (camps.data || []).forEach(c => { campusByName[c.name] = c.id; campusById[c.id] = c.name; });
  (grps.data || []).forEach(g => { groupByName[g.name] = g.id; groupById[g.id] = g.name; });
  return { campusByName, campusById, groupByName, groupById };
}
async function ensureCampusId(name, maps) {
  if (!name) return null;
  if (maps.campusByName[name]) return maps.campusByName[name];
  const { data, error } = await SB.from("campuses").insert({ org_id: ORG_ID, name: name }).select("id").single();
  if (error || !data) return null;
  maps.campusByName[name] = data.id; maps.campusById[data.id] = name;
  return data.id;
}

// Conjunto de ids de Stick válidos da org (RLS filtra). Usado para não violar a FK.
async function validStickSet() {
  const r = await SB.from("sticks").select("id");
  const set = new Set();
  (r.data || []).forEach(x => set.add(x.id));
  return set;
}

// linha da sessão -> objeto sessão do app (attendees preenchidos à parte)
function rowToSession(row, maps, attendeesById) {
  return {
    id: row.id,
    campus: maps.campusById[row.campus_id] || "",
    group: (row.context_type === "group" && row.context_id) ? (maps.groupById[row.context_id] || "") : "",
    date: row.session_date || "",
    attendees: attendeesById[row.id] || [],
    photo: row.photo || null,
  };
}

// objeto sessão -> linha da sessão. `createdAt` só no backfill (preserva a data).
function sessionToRow(s, maps, createdAt) {
  const hasGroup = !!s.group;
  const row = {
    org_id: ORG_ID,
    context_type: hasGroup ? "group" : "service",
    context_id: hasGroup ? (maps.groupByName[s.group] || null) : null,
    campus_id: null, // preenchido pelo caller após ensureCampusId
    title: null,
    session_date: s.date || null,
    session_time: null,
    photo: s.photo || null,
  };
  if (!CTX_ALLOWED.includes(row.context_type)) row.context_type = "service";
  if (createdAt) row.created_at = createdAt;
  return row;
}

// Reconcilia os records de uma sessão: apaga os existentes e insere um por
// attendee VÁLIDO (isUuid + presente em validSet), com status='present'.
async function writeRecords(sessionId, attendees, validSet, source) {
  await SB.from("attendance_records").delete().eq("session_id", sessionId);
  const list = attendees || [];
  const rows = list
    .filter(a => isUuid(a) && (!validSet || validSet.has(a)))
    .map(a => ({ session_id: sessionId, stick_id: a, status: "present", source: source }));
  const dropped = list.length - rows.length;
  if (dropped > 0) console.warn("writeRecords: " + dropped + " attendee(s) órfão(s) ignorado(s) na sessão " + sessionId);
  if (rows.length) {
    const { error } = await SB.from("attendance_records").insert(rows);
    if (error) console.warn("writeRecords(insert):", error.message);
  }
}

// Cria/atualiza a sessão + seus records. Devolve o id definitivo (uuid do banco
// no caso de criação). Sem login, é no-op (devolve o id atual).
// opts: { source='checkin', createdAt=null, validSet=null, maps=null }
export async function upsertSession(s, opts) {
  opts = opts || {};
  if (!SB || !ORG_ID) return s.id;
  const maps = opts.maps || await refMaps();
  const validSet = opts.validSet || await validStickSet();
  const source = opts.source || "checkin";
  const campusId = await ensureCampusId(s.campus, maps);
  const row = sessionToRow(s, maps, opts.createdAt);
  row.campus_id = campusId;

  let sessionId;
  if (isUuid(s.id)) {
    const { error } = await SB.from("attendance_sessions").update(row).eq("id", s.id);
    if (error) { console.warn("upsertSession(update):", error.message); return s.id; }
    sessionId = s.id;
  } else {
    const { data, error } = await SB.from("attendance_sessions").insert(row).select("id").single();
    if (error || !data) { console.warn("upsertSession(insert):", error && error.message); return s.id; }
    sessionId = data.id;
  }
  await writeRecords(sessionId, s.attendees, validSet, source);
  return sessionId;
}

// Carrega as sessões (+ presentes) das tabelas para o state. Se attendance_sessions
// estiver vazia e o app_state tiver sessões (org anterior ao relacional), faz
// backfill idempotente (só semeia se vazio): sobe pra tabela preservando a data,
// grava records com source='migration' e adota os uuids. Nunca rejeita.
export async function hydrateAttendance(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await refMaps();
    const res = await SB.from("attendance_sessions").select("*");
    if (res.error) { console.warn("hydrateAttendance:", res.error.message); return; }
    const rows = res.data || [];
    const prev = st.sessions || [];

    if (rows.length === 0 && prev.length > 0) {
      const validSet = await validStickSet();
      const migrated = [];
      for (const s of prev) {
        const newId = await upsertSession(s, { source: "migration", createdAt: s.date || null, validSet, maps });
        migrated.push(Object.assign({}, s, { id: newId }));
      }
      st.sessions = migrated;
      save(); // persiste os uuids no app_state
      return;
    }

    // reconstrói attendees[] a partir dos records presentes
    const ids = rows.map(r => r.id);
    const attendeesById = {};
    if (ids.length) {
      const recs = await SB.from("attendance_records").select("session_id,stick_id,status").in("session_id", ids);
      if (recs.error) { console.warn("hydrateAttendance(records):", recs.error.message); }
      (recs.data || []).forEach(rec => {
        if (rec.status !== "present") return;
        (attendeesById[rec.session_id] = attendeesById[rec.session_id] || []).push(rec.stick_id);
      });
    }
    st.sessions = rows.map(row => rowToSession(row, maps, attendeesById));
  } catch (e) {
    console.warn("hydrateAttendance(exceção):", e && e.message);
  }
}
