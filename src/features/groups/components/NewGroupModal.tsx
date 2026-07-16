"use client";

import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction } from "../actions";
import type { Person } from "@/features/sticks/types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function NewGroupModal({
  members,
  campuses,
  activeCampus,
  onClose,
}: {
  members: Person[];
  campuses: string[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createGroupAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Novo grupo</h3>
        <div className="field">
          <label>Nome do grupo</label>
          <input name="name" placeholder="Ex.: Jovens" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="mrow">
          <div className="field">
            <label>Líder</label>
            <Select name="leaderStickId" defaultValue="">
              <option value="">(sem líder)</option>
              {members.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Campus</label>
            <Select name="campus" defaultValue={activeCampus}>
              {campuses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mrow">
          <div className="field"><label>Dia</label><input name="day" placeholder="Ex.: Quarta" /></div>
          <div className="field"><label>Horário</label><input name="time" placeholder="Ex.: 20h" /></div>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Criando…" : "Criar grupo"}</button>
        </div>
      </form>
    </div>
  );
}
