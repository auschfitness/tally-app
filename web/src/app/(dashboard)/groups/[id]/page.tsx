import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { listGroups, listGroupSessions } from "@/features/groups/queries";
import { listPrayers } from "@/features/prayer/queries";
import { careReasons, relLabel } from "@/features/sticks/domain";
import { bandOf } from "@/features/groups/domain";
import { GroupLeaderControl, GroupAttendanceButton } from "@/features/groups/components/GroupTools";
import { agoLabel, initials, brDate } from "@/lib/utils/date";
import type { Person } from "@/features/sticks/types";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId } = await requireOrg();

  const [people, groups, sessions, prayers] = await Promise.all([
    listSticks(supabase, orgId),
    listGroups(supabase, orgId),
    listGroupSessions(supabase, orgId, id),
    listPrayers(supabase, orgId),
  ]);

  const group = groups.find((g) => g.id === id);
  if (!group) notFound();

  const members = people.filter((p) => p.group === group.name);
  const acc = members.filter((p) => careReasons(p).length === 0).length;
  const rate = members.length ? Math.round((acc / members.length) * 100) : 0;
  const band = bandOf(members.length, rate);
  const leaderId = members.find((p) => p.name === group.leader)?.id ?? "";
  const groupPrayers = prayers.filter((p) => p.group === group.name && !p.answered);

  function memberRow(p: Person) {
    const care = careReasons(p);
    return (
      <div className="li" key={p.id}>
        <div className={`av${care.length ? " c" : ""}`}>{initials(p.name)}</div>
        <div>
          <div><b>{p.name}</b></div>
          <div className="meta">{agoLabel(p.lastSeen)}{care.length ? ` · ${care[0]!.short}` : ""}</div>
        </div>
        <div className="right">
          {care.length ? <span className="chip care">Atenção</span> : <span className={`chip ${p.relationship === "member" ? "member" : "visitor"}`}>{relLabel(p.relationship)}</span>}
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href="/groups" className="link">← Voltar aos grupos</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{group.name}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {group.leader ? `Líder: ${group.leader}` : "Sem líder"}
            {group.day ? ` · ${group.day} ${group.time}` : ""}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <GroupAttendanceButton groupId={group.id} campus={group.campus} members={members} />
        </div>
      </div>

      <div className="cards">
        <div className="stat"><div className="k">Membros</div><div className="v">{members.length}</div></div>
        <div className="stat"><div className="k">Em dia</div><div className="v pos">{acc}</div></div>
        <div className="stat"><div className="k">Saúde</div><div className="v" style={{ paddingTop: 4 }}><span className={`hb ${band}`}>{rate}%</span></div></div>
        <div className="stat"><div className="k">Pedidos ativos</div><div className="v">{groupPrayers.length}</div></div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Membros</h3></div>
          {members.length ? members.map(memberRow) : <div className="empty">Sem membros. Defina o grupo de pessoas na aba Sticks.</div>}
        </div>
        <div className="panel">
          <div className="ph"><h3>Presença recente</h3></div>
          {sessions.length === 0 ? (
            <div className="empty">Sem registros de presença ainda. Toque em &quot;Registrar presença&quot;.</div>
          ) : (
            sessions.slice(0, 6).map((s, i) => (
              <div className="li" key={i}>
                <div className="av">{s.count}</div>
                <div>
                  <div><b>{brDate(s.date)}</b></div>
                  <div className="meta">{s.count} presente{s.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Líder</h3></div>
          <GroupLeaderControl groupId={group.id} members={members} currentLeaderId={leaderId} />
        </div>
        <div className="panel">
          <div className="ph"><h3>Orações do grupo</h3></div>
          {groupPrayers.length ? (
            groupPrayers.map((p) => (
              <div className="li" key={p.id}>
                <div className="av c">{initials(p.author)}</div>
                <div>
                  <div><b>{p.author}</b></div>
                  <div className="meta">{p.request}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Nenhum pedido ativo.</div>
          )}
        </div>
      </div>
    </>
  );
}
