"use client";

// Feed do Inbox (Client — dono do filtro de categoria e do modal de atribuição).
// Os signals já chegam VISÍVEIS e ordenados do servidor; a categoria filtra em
// memória. Adiar/Dispensar são forms de Server Action; Atribuir (só Care) abre o
// modal. "Abrir" (perfil da Stick) omitido — ainda não há rota /sticks/[id].
import { useState } from "react";
import { initials } from "@/lib/utils/date";
import { CATEGORIES, levelColor } from "../domain";
import { setSignalStatusAction } from "../actions";
import { AssignCareModal } from "./AssignCareModal";
import type { Signal } from "@/features/signals/domain";

export function InboxFeed({ signals }: { signals: Signal[] }) {
  const [cat, setCat] = useState("all");
  const [assign, setAssign] = useState<Signal | null>(null);
  const feed = cat === "all" ? signals : signals.filter((s) => s.category === cat);

  return (
    <>
      <h1 className="page">Inbox</h1>
      <p className="sub">Coisas que a sua igreja deveria notar.</p>

      <div className="filtchips">
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`fchip${cat === c.key ? " on" : ""}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {feed.length === 0 ? (
          <div className="empty">Nada para notar nessa categoria.</div>
        ) : (
          feed.map((s) => {
            const col = levelColor(s.level);
            return (
              <div key={s.key} className="li">
                <div className="av" style={{ background: col.bg, color: col.fg }}>
                  {s.stickName ? initials(s.stickName) : s.groupName ? "G" : "!"}
                </div>
                <div style={{ flex: 1 }}>
                  <div><b>{s.title}</b></div>
                  <div className="meta">{s.category}{s.why.length ? ` · ${s.why[0]}` : ""}</div>
                </div>
                <div className="right" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.category === "Care" ? (
                    <button className="link" onClick={() => setAssign(s)}>Atribuir</button>
                  ) : null}
                  <form action={setSignalStatusAction}>
                    <input type="hidden" name="signalKey" value={s.key} />
                    <input type="hidden" name="status" value="snoozed" />
                    <button className="link" type="submit">Adiar</button>
                  </form>
                  <form action={setSignalStatusAction}>
                    <input type="hidden" name="signalKey" value={s.key} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button className="link" type="submit">Dispensar</button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {assign ? <AssignCareModal signal={assign} onClose={() => setAssign(null)} /> : null}
    </>
  );
}
