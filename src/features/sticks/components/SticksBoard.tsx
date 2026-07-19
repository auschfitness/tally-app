"use client";

import { useMemo, useState } from "react";
import { agoLabel, ageFrom } from "@/lib/utils/date";
import { careReasons, careLevel, isVisitor, journeyLabel, relLabel } from "../domain";
import type { Person } from "../types";
import { PersonModal } from "./PersonModal";

type RelFilter = "" | "visitor" | "member" | "leader" | "inactive";
type CareFilter = "" | "em" | "at" | "ri";

const REL_CHIPS: ReadonlyArray<readonly [RelFilter, string]> = [
  ["", "Todos"],
  ["visitor", "Visitantes"],
  ["member", "Membros"],
  ["leader", "Líderes"],
  ["inactive", "Inativos"],
];

function matches(p: Person, q: string, rel: RelFilter, care: CareFilter): boolean {
  const mq = !q || p.name.toLowerCase().includes(q.toLowerCase());
  const mr =
    !rel ||
    (rel === "visitor" ? isVisitor(p.relationship) : rel === "leader" ? p.isLeader : p.relationship === rel);
  const mc = !care || careLevel(careReasons(p).length) === care;
  return mq && mr && mc;
}

// Relação com prioridade de atenção (espelha relChip do app legado).
function RelCell({ p }: { p: Person }) {
  if (careReasons(p).length > 0) return <span className="chip care">Atenção</span>;
  const cls = p.relationship === "member" ? "member" : "visitor";
  return (
    <>
      <span className={`chip ${cls}`}>{relLabel(p.relationship)}</span>
      {p.isLeader ? <span className="chip leader"> Líder</span> : null}
    </>
  );
}

export function SticksBoard({
  people,
  groups,
  campuses,
  activeCampus,
  canManageMembers,
  pendingInviteStickIds,
  initial,
}: {
  people: Person[];
  groups: string[];
  campuses: string[];
  activeCampus: string;
  canManageMembers: boolean;
  pendingInviteStickIds: string[];
  initial: { q: string; rel: RelFilter; care: CareFilter };
}) {
  const pendingInvites = useMemo(() => new Set(pendingInviteStickIds), [pendingInviteStickIds]);
  const [q, setQ] = useState(initial.q);
  const [rel, setRel] = useState<RelFilter>(initial.rel);
  const [care, setCare] = useState<CareFilter>(initial.care);
  const [modal, setModal] = useState<{ open: boolean; person: Person | null }>({ open: false, person: null });

  function syncUrl(next: { q: string; rel: RelFilter; care: CareFilter }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.rel) params.set("rel", next.rel);
    if (next.care) params.set("care", next.care);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }
  function update(patch: Partial<{ q: string; rel: RelFilter; care: CareFilter }>) {
    const next = { q, rel, care, ...patch };
    setQ(next.q);
    setRel(next.rel);
    setCare(next.care);
    syncUrl(next);
  }

  const dist = useMemo(() => {
    let em = 0, at = 0, ri = 0;
    for (const p of people) {
      const n = careReasons(p).length;
      if (n === 0) em++;
      else if (n === 1) at++;
      else ri++;
    }
    return { em, at, ri };
  }, [people]);

  const composition = useMemo(() => {
    let visitors = 0, members = 0, inactive = 0;
    for (const p of people) {
      if (isVisitor(p.relationship)) visitors++;
      else if (p.relationship === "inactive") inactive++;
      else members++;
    }
    return { visitors, members, inactive };
  }, [people]);

  const filtered = useMemo(() => people.filter((p) => matches(p, q, rel, care)), [people, q, rel, care]);
  const needAttention = dist.at + dist.ri;
  const visitorsCount = composition.visitors;

  const total = people.length || 1;
  const donut = `conic-gradient(var(--blue) 0 ${(composition.visitors / total) * 100}%, var(--green) 0 ${
    ((composition.visitors + composition.members) / total) * 100
  }%, #8A96AE 0 100%)`;

  const engagement: ReadonlyArray<readonly [CareFilter, string, number, string]> = [
    ["em", "Em dia", dist.em, "healthy"],
    ["at", "Atenção", dist.at, "attention"],
    ["ri", "Em risco", dist.ri, "risk"],
  ];
  const maxc = Math.max(dist.em, dist.at, dist.ri, 1);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <h1 className="page">Sticks</h1>
          <p className="sub" style={{ margin: 0 }}>
            Pessoas da sua igreja. Cada pessoa é uma Stick, uma vida que não passa despercebida.
          </p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setModal({ open: true, person: null })}>
          + Nova pessoa
        </button>
      </div>

      <div className="ministrip" style={{ marginTop: 14 }}>
        <div>
          <div className="mi-k">Sticks</div>
          <div className="mi-v">{people.length}</div>
        </div>
        <div>
          <div className="mi-k">Visitantes</div>
          <div className="mi-v">{visitorsCount}</div>
        </div>
        <div>
          <div className="mi-k">Precisam de atenção</div>
          <div className="mi-v neg">{needAttention}</div>
        </div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph">
            <h3>Composição</h3>
          </div>
          <div className="donutwrap">
            <div style={{ width: 150, height: 150, margin: "0 auto", borderRadius: "50%", background: donut, mask: "radial-gradient(circle 44px at center, transparent 98%, #000 100%)", WebkitMask: "radial-gradient(circle 44px at center, transparent 98%, #000 100%)" }} />
            <div className="donutctr">
              <b>{people.length}</b>
              <span>Sticks</span>
            </div>
          </div>
          <div className="leg">
            <span style={{ cursor: "pointer" }} onClick={() => update({ rel: rel === "visitor" ? "" : "visitor" })}>
              <i style={{ background: "#2B5CE6" }} />Visitantes · {composition.visitors}
            </span>
            <span style={{ cursor: "pointer" }} onClick={() => update({ rel: rel === "member" ? "" : "member" })}>
              <i style={{ background: "#1FA97A" }} />Membros · {composition.members}
            </span>
            <span style={{ cursor: "pointer" }} onClick={() => update({ rel: rel === "inactive" ? "" : "inactive" })}>
              <i style={{ background: "#8A96AE" }} />Inativos · {composition.inactive}
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <h3>Engajamento</h3>
            <span className="muted" style={{ marginLeft: "auto" }}>toque numa faixa</span>
          </div>
          {engagement.map(([key, label, n, band]) => (
            <div
              key={key}
              className={`engrow${care === key ? " on" : ""}`}
              onClick={() => update({ care: care === key ? "" : key })}
              style={{ cursor: "pointer" }}
            >
              <span className="englbl">{label}</span>
              <div className="engbar">
                <i className={band} style={{ width: `${Math.round((n / maxc) * 100)}%` }} />
              </div>
              <span className="engn">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="ph">
          <h3>Todas as Sticks</h3>
          <input
            className="searchbox"
            style={{ maxWidth: 220, margin: "0 0 0 auto" }}
            placeholder="Buscar por nome..."
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>
        <div className="filtchips">
          {REL_CHIPS.map(([key, label]) => (
            <button key={key} className={`fchip${rel === key ? " on" : ""}`} onClick={() => update({ rel: rel === key ? "" : key })}>
              {label}
            </button>
          ))}
        </div>
        <table style={{ border: "none" }}>
          <tbody>
            <tr>
              <th>Stick</th>
              <th>Relação</th>
              <th>Jornada</th>
              <th>Grupo</th>
              <th>Última presença</th>
            </tr>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">Nenhuma Stick nesse filtro.</td>
              </tr>
            ) : (
              filtered.map((p) => {
                const age = ageFrom(p.birthDate);
                return (
                  <tr key={p.id} className="rowlink" style={{ cursor: "pointer" }} onClick={() => setModal({ open: true, person: p })}>
                    <td>
                      <b>{p.name}</b>
                      {age != null ? <span className="muted"> · {age}a</span> : null}
                      {p.userId ? (
                        <span className="chip member" style={{ marginLeft: 6 }}>app</span>
                      ) : pendingInvites.has(p.id) ? (
                        <span className="chip" style={{ marginLeft: 6 }}>convite</span>
                      ) : null}
                    </td>
                    <td><RelCell p={p} /></td>
                    <td>{journeyLabel(p.journeyStage)}</td>
                    <td>{p.group ? p.group : <span className="muted">sem grupo</span>}</td>
                    <td>{agoLabel(p.lastSeen)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal.open ? (
        <PersonModal
          person={modal.person}
          groups={groups}
          campuses={campuses}
          activeCampus={activeCampus}
          canManageMembers={canManageMembers}
          hasPendingInvite={modal.person ? pendingInvites.has(modal.person.id) : false}
          onClose={() => setModal({ open: false, person: null })}
        />
      ) : null}
    </>
  );
}
