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
    const res = await SB.from("group_members").select("group_id,stick_id,role,status,left_at,joined_at");
    if (res.error) { console.warn("hydrateGroupMembers:", res.error.message); return; }
    const all = res.data || [];
    const rows = all.filter(r => r.status !== "inactive" && !r.left_at);
    const prev = st.people || [];

    // metadados por grupo p/ Group Health/Signals (Fase 4): contagem, novos membros
    // (joined_at <=30d) e saídas recentes (left_at <=30d). Só dado real.
    const t = today();
    const daysAgo = (d) => d ? Math.floor((t - new Date(d)) / 86400000) : Infinity;
    const meta = {};
    all.forEach(r => {
      const gname = maps.byId[r.group_id]; if (!gname) return;
      const m = meta[gname] || (meta[gname] = { count: 0, newMembers: 0, leftRecently: 0 });
      if (r.status !== "inactive" && !r.left_at) { m.count++; if (daysAgo(r.joined_at) <= 30) m.newMembers++; }
      else if (r.left_at && daysAgo(r.left_at) <= 30) { m.leftRecently++; }
    });
    st.groupMembers = meta;

    // --- MEMBROS: reconcilia TODO load (idempotente), não só quando a tabela está
    // vazia. Garante uma member row p/ cada Stick com p.group casável que ainda não
    // tem linha ativa. `ignoreDuplicates` evita rebaixar líder ou colidir com linha
    // inativa (a UNIQUE group_id+stick_id barra). Corrige o backfill one-shot antigo,
    // que pulava membros quando linhas de líder já existiam.
    const activeKey = new Set(all.filter(r => r.status !== "inactive" && !r.left_at).map(r => r.group_id + "|" + r.stick_id));
    const ensure = [];
    prev.forEach(p => {
      if (!isUuid(p.id) || !p.group) return;
      const gid = maps.byName[p.group];
      if (!gid) { console.warn("hydrateGroupMembers: grupo não encontrado:", p.group); return; }
      if (!activeKey.has(gid + "|" + p.id)) ensure.push({ group_id: gid, stick_id: p.id, role: "member" });
    });
    if (ensure.length) {
      const ins = await SB.from("group_members").upsert(ensure, { onConflict: "group_id,stick_id", ignoreDuplicates: true });
      if (ins.error) console.warn("hydrateGroupMembers(ensure members):", ins.error.message);
    }
    // restaura p.group das linhas ativas (1 grupo/Stick; só SETA quando há linha).
    const byStick = {};
    rows.forEach(r => { const gname = maps.byId[r.group_id]; if (gname && !byStick[r.stick_id]) byStick[r.stick_id] = gname; });
    prev.forEach(p => { if (byStick[p.id]) p.group = byStick[p.id]; });

    // --- LÍDER: backfill de g.leader se ainda não há role='leader'; senão restaura g.leader ---
    const leaderRows = rows.filter(r => r.role === "leader");
    if (leaderRows.length === 0) {
      for (const g of (st.groups || [])) {
        if (!g.leader) continue;
        const gid = maps.byName[g.name]; if (!gid) continue;
        const ls = prev.find(x => x.name === g.leader && isUuid(x.id));
        if (!ls) { console.warn("hydrateGroupMembers(leader backfill): stick não encontrada:", g.leader); continue; }
        const up = await SB.from("group_members").upsert(
          { group_id: gid, stick_id: ls.id, role: "leader", status: "active", left_at: null },
          { onConflict: "group_id,stick_id" }
        );
        if (up.error) console.warn("hydrateGroupMembers(leader backfill):", up.error.message);
      }
      // g.leader já está correto no app_state
    } else {
      const leaderByGroup = {};
      leaderRows.forEach(r => { const gname = maps.byId[r.group_id]; if (gname && !leaderByGroup[gname]) leaderByGroup[gname] = r.stick_id; });
      (st.groups || []).forEach(g => { const sid = leaderByGroup[g.name]; if (sid) { const p = prev.find(x => x.id === sid); if (p) g.leader = p.name; } });
    }
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

// Define/troca o líder de um grupo: rebaixa o líder anterior a 'member' e põe o novo
// como role='leader' (upsert). Gera timeline. Mantém `g.leader` (nome) sincronizado.
// `leaderName` vazio = grupo sem líder. Sem login, é no-op.
export async function setGroupLeader(groupName, leaderName) {
  if (!SB || !ORG_ID) return;
  const maps = await groupMaps();
  const gid = maps.byName[groupName]; if (!gid) { console.warn("setGroupLeader: grupo não encontrado:", groupName); return; }

  // rebaixa os líderes atuais deste grupo
  const cur = await SB.from("group_members").select("id,role").eq("group_id", gid);
  if (cur.error) { console.warn("setGroupLeader(read):", cur.error.message); return; }
  for (const r of (cur.data || [])) {
    if (r.role !== "leader") continue;
    const upd = await SB.from("group_members").update({ role: "member" }).eq("id", r.id);
    if (upd.error) console.warn("setGroupLeader(demote):", upd.error.message);
  }

  // promove o novo líder (se houver), reusando a linha de membro pela UNIQUE
  if (leaderName) {
    const ls = (state.people || []).find(x => x.name === leaderName && isUuid(x.id));
    if (ls) {
      const up = await SB.from("group_members").upsert(
        { group_id: gid, stick_id: ls.id, role: "leader", status: "active", left_at: null, joined_at: iso(today()) },
        { onConflict: "group_id,stick_id" }
      );
      if (up.error) console.warn("setGroupLeader(promote):", up.error.message);
      else await addTimeline(ls.id, "group_leader_set", "Tornou-se líder", "Líder de " + groupName);
    } else { console.warn("setGroupLeader: stick não encontrada:", leaderName); }
  }

  const g = (state.groups || []).find(x => x.name === groupName);
  if (g) { g.leader = leaderName || ""; save(); }
}
