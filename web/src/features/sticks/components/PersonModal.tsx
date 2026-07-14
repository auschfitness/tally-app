"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createStickAction, updateStickAction, archiveStickAction } from "../actions";
import { RELATIONSHIPS, relLabelFull } from "../domain";
import type { Person } from "../types";
import { type ActionResult } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";

const INITIAL: ActionResult = { success: true, data: undefined };

export function PersonModal({
  person,
  groups,
  campuses,
  activeCampus,
  onClose,
}: {
  person: Person | null;
  groups: string[];
  campuses: string[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    person ? updateStickAction : createStickAction,
    INITIAL,
  );

  // Sucesso de uma submissão real (o estado inicial também é success, mas é a MESMA
  // referência INITIAL) → fecha o modal e recarrega os dados revalidados na action.
  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  async function handleArchive() {
    if (!person) return;
    const fd = new FormData();
    fd.set("id", person.id);
    await archiveStickAction(fd);
    onClose();
    router.refresh();
  }

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{person ? "Editar Stick" : "Nova Stick"}</h3>
        {person ? <input type="hidden" name="id" value={person.id} /> : null}

        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={person?.name ?? ""} placeholder="Nome completo" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>

        <div className="mrow">
          <div className="field">
            <label>Relação</label>
            <select name="relationship" defaultValue={person?.relationship ?? "member"}>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {relLabelFull(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Campus</label>
            <select name="campus" defaultValue={person?.campus || activeCampus}>
              {campuses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mrow">
          <div className="field">
            <label>Grupo</label>
            <select name="group" defaultValue={person?.group ?? ""}>
              <option value="">(nenhum)</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Última presença</label>
            <input type="date" name="lastSeen" defaultValue={person?.lastSeen || isoDate(today())} />
            {fieldErrors?.lastSeen ? <div className="gerr">{fieldErrors.lastSeen[0]}</div> : null}
          </div>
        </div>

        <div className="field check">
          <input type="checkbox" name="isLeader" defaultChecked={person?.isLeader ?? false} id="pm-leader" />
          <label htmlFor="pm-leader">É líder</label>
        </div>
        <div className="field check">
          <input type="checkbox" name="followup" defaultChecked={person?.followup ?? false} id="pm-followup" />
          <label htmlFor="pm-followup">Follow-up em aberto</label>
        </div>

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}

        <div className="actions">
          {person ? (
            <button className="btn danger" type="button" onClick={handleArchive} disabled={pending}>
              Arquivar
            </button>
          ) : null}
          <button className="btn ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
