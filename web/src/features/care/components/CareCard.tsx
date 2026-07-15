"use client";

// Card de um Care Item (Client — dono dos modais de contato/nota/edição e do form
// de exclusão). Mostra pessoa, motivo, responsável, próxima ação, prazo e o
// histórico (contatos + notas). "Excluir" só aparece com care.manage.
import { useState } from "react";
import { brDate, initials } from "@/lib/utils/date";
import { PRIORITY_BAND, PRIORITY_LBL, STATUS_LBL } from "../domain";
import { deleteCareItemAction } from "../actions";
import type { CareItem, MemberOption, StickOption } from "../types";
import { CareItemModal } from "./CareItemModal";
import { ContactModal } from "./ContactModal";
import { NoteModal } from "./NoteModal";
import styles from "../care.module.css";

type Modal = "none" | "contact" | "note" | "edit";

export function CareCard({
  item,
  members,
  sticks,
  canManage,
}: {
  item: CareItem;
  members: MemberOption[];
  sticks: StickOption[];
  canManage: boolean;
}) {
  const [modal, setModal] = useState<Modal>("none");
  const who = item.stickName || item.title;

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div className={styles.itemTop}>
        <div className="av c">{item.stickName ? initials(item.stickName) : "!"}</div>
        <div className={styles.itemBody}>
          <div className={styles.itemName}>
            <span>{who}</span>
            <span className={`hb ${PRIORITY_BAND[item.priority]}`}>{PRIORITY_LBL[item.priority]}</span>
            <span className="muted">· {STATUS_LBL[item.status]}</span>
          </div>
          {item.description ? <div className="muted" style={{ margin: "5px 0" }}>{item.description}</div> : null}
          <div className={styles.itemMeta}>
            Responsável: <b style={{ color: "var(--text)" }}>{item.assignedName}</b>
            {" · "}Próxima ação: {item.next_action || "—"}
            {" · "}Prazo: {item.due_date ? brDate(item.due_date) : "—"}
          </div>

          {item.contacts.length > 0 || item.notes.length > 0 ? (
            <div className={styles.log}>
              {item.contacts.map((c) => (
                <div key={c.id} className={styles.logLine}>
                  <b>{brDate(c.contacted_on)}</b> · {c.note}
                  {c.method ? ` (${c.method})` : ""} — {c.byName}
                </div>
              ))}
              {item.notes.map((n) => (
                <div key={n.id} className={styles.noteLine}>
                  📝 {n.content} — {n.authorName}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.itemActions}>
          <button className="btn ghost sm" onClick={() => setModal("contact")}>Registrar contato</button>
          <button className="btn ghost sm" onClick={() => setModal("note")}>Nota</button>
          <button className="btn ghost sm" onClick={() => setModal("edit")}>Editar</button>
          {canManage ? (
            <form action={deleteCareItemAction}>
              <input type="hidden" name="id" value={item.id} />
              <button className="btn ghost sm" type="submit">Excluir</button>
            </form>
          ) : null}
        </div>
      </div>

      {modal === "contact" ? <ContactModal careItemId={item.id} onClose={() => setModal("none")} /> : null}
      {modal === "note" ? <NoteModal careItemId={item.id} onClose={() => setModal("none")} /> : null}
      {modal === "edit" ? <CareItemModal item={item} members={members} sticks={sticks} onClose={() => setModal("none")} /> : null}
    </div>
  );
}
