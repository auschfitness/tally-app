"use client";

// Controle de líder + registro de presença do grupo (Client — Server Actions).
import { Select } from "@/components/shared/Select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGroupLeaderAction, recordGroupAttendanceAction } from "../actions";
import type { Person } from "@/features/sticks/types";

export function GroupLeaderControl({
  groupId,
  members,
  currentLeaderId,
}: {
  groupId: string;
  members: Person[];
  currentLeaderId: string;
}) {
  return (
    <form action={setGroupLeaderAction} className="mrow">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="field">
        <label>Definir líder do grupo</label>
        <Select name="leaderStickId" defaultValue={currentLeaderId}>
          <option value="">(sem líder)</option>
          {members.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>
      <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
        <button className="btn ghost" type="submit">Salvar líder</button>
      </div>
    </form>
  );
}

export function GroupAttendanceButton({
  groupId,
  campus,
  members,
}: {
  groupId: string;
  campus: string;
  members: Person[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    await recordGroupAttendanceAction(formData);
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Registrar presença</button>
      {open ? (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="modal wide" action={submit}>
            <h3>Registrar presença</h3>
            <div className="msub">{campus} · hoje · marque quem veio</div>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="campus" value={campus} />
            <div style={{ maxHeight: "46vh", overflow: "auto" }}>
              {members.length === 0 ? (
                <div className="empty">Sem membros neste grupo. Adicione pessoas ao grupo primeiro.</div>
              ) : (
                members.map((p) => (
                  <label key={p.id} className="field check" style={{ padding: "6px 0" }}>
                    <input type="checkbox" name="stick" value={p.id} defaultChecked />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar presença"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
