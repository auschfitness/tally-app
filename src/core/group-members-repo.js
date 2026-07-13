// Repositório da relação Stick↔Grupo (Step 4 · Fase 3). Migra a associação de
// MEMBRO do campo de texto `p.group` para a tabela relacional `group_members`
// (role='member'). Mantém `p.group` (o nome do grupo do membro) sincronizado para
// as telas atuais (Saúde dos Grupos e detalhe seguem lendo igual).
//
// ESCOPO: só MEMBROS nesta fase. O LÍDER (`g.leader`) continua no app_state e será
// migrado (role='leader' + leader_id/co_leader_ids) na fase de redesign da página de Groups.
//
// Cuidados:
//  1. RLS: SELECT sem filtro de org. `group_members` NÃO tem org_id — o insert NÃO
//     manda org_id; o isolamento herda do grupo-pai (RLS `gm_all` via group_id),
//     igual attendance_records. (Validado: membership em grupo de outra org é bloqueado.)
//  2. FK: stick_id e group_id são NOT NULL. Só grava membro que casa com uma Stick
//     válida e um grupo existente; senão pula com aviso (nunca inventa vínculo).
//  3. Uma associação por Stick (espelha a UI de 1 grupo/pessoa). role usa o enum
//     group_member_role (member/leader/co_leader/host).
//  4. Entrar/sair de grupo gera `timeline_events` (memória da igreja).

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";
import { iso, today } from "./helpers.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

// nome<->id de grupos (RLS filtra por org)
async function groupMaps() {
  const gs = await SB.from("groups").select("id,name");
  const byName = {}, byId = {};
  (gs.data || []).forEach(g => { byName[g.name] = g.id; byId[g.id] = g.name; });
  return { byName, byId };
}

async function addTimeline(stickId, type, title, summary) {
  const r = await SB.from("timeline_events").insert({
    org_id: ORG_ID, stick_id: stickId, event_type: type, source_module: "groups",
    title: title, summary: summary, occurred_at: nowIso(),
  });
  if (r.error) console.warn("group timeline_event:", r.error.message);
}

// Carrega os membros de `group_members` e restaura `p.group` para as telas. Se a
// tabela estiver vazia e o app_state tiver membros (p.group), faz backfill. Nunca rejeita.
export async function hydrateGroupMembers(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await groupMaps();
    const res = await SB.from("group_members").select("group_id,stick_id,role,status,left_at");
    if (res.error) { console.warn("hydrateGroupMembers:", res.error.message); return; }
    const rows = (res.data || []).filter(r => r.status !== "inactive" && !r.left_at);
    const prev = st.people || [];

    if (rows.length === 0) {
      // backfill: cada Stick com p.group casando com um grupo real vira um member
      const toInsert = [];
      prev.forEach(p => {
        if (!isUuid(p.id) || !p.group) return;
        const gid = maps.byName[p.group];
        if (!gid) { console.warn("hydrateGroupMembers(backfill): grupo não encontrado:", p.group); return; }
        toInsert.push({ group_id: gid, stick_id: p.id, role: "member" });
      });
      if (toInsert.length) {
        const ins = await SB.from("group_members").insert(toInsert);
        if (ins.error) console.warn("hydrateGroupMembers(backfill insert):", ins.error.message);
      }
      return; // p.group já está correto (veio do app_state e foi semeado)
    }

    // restaura p.group a partir dos membros ativos (1 grupo/Stick; se houver mais de
    // um, o primeiro por ordem de chegada). Só SETA quando há linha; nunca limpa o
    // que não tem linha (setStickGroup mantém o app_state em dia nas remoções).
    const byStick = {};
    rows.forEach(r => { const gname = maps.byId[r.group_id]; if (gname && !byStick[r.stick_id]) byStick[r.stick_id] = gname; });
    prev.forEach(p => { if (byStick[p.id]) p.group = byStick[p.id]; });
  } catch (e) {
    console.warn("hydrateGroupMembers(exceção):", e && e.message);
  }
}

// Reconcilia a associação da Stick: fecha as associações antigas (left_at + inactive,
// preservando histórico) e entra no grupo novo (upsert). Gera timeline de saída/entrada.
// Sem login, é no-op. `groupName` vazio = sair de todos os grupos.
export async function setStickGroup(stickId, groupName) {
  if (!SB || !ORG_ID || !isUuid(stickId)) return;
  const maps = await groupMaps();
  const newGid = groupName ? (maps.byName[groupName] || null) : null;

  const cur = await SB.from("group_members").select("id,group_id,status,left_at").eq("stick_id", stickId);
  if (cur.error) { console.warn("setStickGroup(read):", cur.error.message); return; }
  const active = (cur.data || []).filter(r => r.status !== "inactive" && !r.left_at);
  const already = newGid && active.some(r => r.group_id === newGid);

  // fecha as associações que não são o alvo
  for (const r of active) {
    if (newGid && r.group_id === newGid) continue;
    const upd = await SB.from("group_members").update({ left_at: iso(today()), status: "inactive" }).eq("id", r.id);
    if (upd.error) { console.warn("setStickGroup(close):", upd.error.message); continue; }
    await addTimeline(stickId, "group_left", "Saiu do grupo", "Saiu de " + (maps.byId[r.group_id] || "grupo"));
  }

  // entra no grupo alvo (reativa a linha se já existia, pela UNIQUE)
  if (newGid && !already) {
    const up = await SB.from("group_members").upsert(
      { group_id: newGid, stick_id: stickId, role: "member", status: "active", left_at: null, joined_at: iso(today()) },
      { onConflict: "group_id,stick_id" }
    );
    if (up.error) console.warn("setStickGroup(upsert):", up.error.message);
    else await addTimeline(stickId, "group_joined", "Entrou em grupo", "Entrou em " + groupName);
  }

  const p = (state.people || []).find(x => x.id === stickId);
  if (p) { p.group = groupName || ""; save(); }
}
