"use client";

// Modal de criar/editar Care Item (Client — Server Actions). Espelha o padrão do
// SeriesModal (useActionState + sentinela de edição). "Responsável" é um membro
// (auth.users) e "pessoa" é uma Stick — selects distintos (ver handoff).
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCareItemAction, updateCareItemAction } from "../actions";
import { PRIORITY_LBL, PRIORITIES, STATUS_LBL, OPEN_STATUSES } from "../domain";
import type { CareItem, CareStatus, MemberOption, StickOption } from "../types";
import { type ActionResult } from "@/lib/errors";

const INITIAL_NEW: ActionResult<{ id: string }> = { success: true, data: { id: "" } };
const INITIAL_EDIT: ActionResult = { success: true, data: undefined };
const EDIT_STATUSES: CareStatus[] = [...OPEN_STATUSES, "resolved", "closed"];

export function CareItemModal({
  item,
  members,
  sticks,
  onClose,
}: {
  item?: CareItem;
  members: MemberOption[];
  sticks: StickOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !item;
  const [newState, newAction, creating] = useActionState(createCareItemAction, INITIAL_NEW);
  const [editState, editAction, editing] = useActionState(updateCareItemAction, INITIAL_EDIT);
  const state = isNew ? newState : editState;
  const pending = isNew ? creating : editing;

  useEffect(() => {
    if (isNew) {
      if (newState.success && newState.data.id) {
        onClose();
        router.refresh();
      }
    } else if (editState.success && editState !== INITIAL_EDIT) {
      onClose();
      router.refresh();
    }
  }, [isNew, newState, editState, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={isNew ? newAction : editAction}>
        <h3>{isNew ? "Novo Care" : "Editar Care"}</h3>
        {item ? <input type="hidden" name="id" value={item.id} /> : null}

        <div className="field">
          <label>Título</label>
          <input name="title" defaultValue={item?.title ?? ""} placeholder="Ex.: Acompanhar após perda" autoFocus />
          {fieldErrors?.title ? <div className="gerr">{fieldErrors.title[0]}</div> : null}
        </div>

        <div className="mrow">
          <div className="field">
            <label>Pessoa (Stick)</label>
            <select name="stickId" defaultValue={item?.stick_id ?? ""}>
              <option value="">— Sem pessoa —</option>
              {sticks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Responsável</label>
            <select name="assignedTo" defaultValue={item?.assigned_to ?? ""}>
              <option value="">— Ninguém —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea name="description" rows={2} defaultValue={item?.description ?? ""} placeholder="O que está acontecendo" />
        </div>

        <div className="mrow">
          <div className="field">
            <label>Prioridade</label>
            <select name="priority" defaultValue={item?.priority ?? "attention"}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LBL[p]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Prazo</label>
            <input type="date" name="dueDate" defaultValue={item?.due_date ?? ""} />
          </div>
        </div>

        <div className="field">
          <label>Próxima ação</label>
          <input name="nextAction" defaultValue={item?.next_action ?? ""} placeholder="Ex.: Ligar para a pessoa" />
        </div>

        {isNew ? (
          <input type="hidden" name="status" value="assigned" />
        ) : (
          <div className="field">
            <label>Status</label>
            <select name="status" defaultValue={item?.status ?? "assigned"}>
              {EDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LBL[s]}</option>)}
            </select>
          </div>
        )}

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar Care" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
