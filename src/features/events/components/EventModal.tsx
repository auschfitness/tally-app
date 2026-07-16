"use client";

// Modal de criar/editar Evento (Client — Server Actions). Ao criar, navega para o
// detalhe do novo evento (paridade com o legado).
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEventAction, updateEventAction, deleteEventAction } from "../actions";
import { STATUS_LBL } from "../domain";
import type { EventItem } from "../types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult<{ id: string }> = { success: true, data: { id: "" } };
const INITIAL_EDIT: ActionResult = { success: true, data: undefined };

export function EventModal({
  event,
  campuses,
  activeCampus,
  onClose,
}: {
  event?: EventItem;
  campuses: string[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !event;
  const [createState, createAction, creating] = useActionState(createEventAction, INITIAL);
  const [editState, editAction, editing] = useActionState(updateEventAction, INITIAL_EDIT);
  const state = isNew ? createState : editState;
  const pending = isNew ? creating : editing;

  useEffect(() => {
    if (isNew) {
      if (createState.success && createState.data.id) {
        onClose();
        router.push(`/events/${createState.data.id}`);
      }
    } else if (editState.success && editState !== INITIAL_EDIT) {
      onClose();
      router.refresh();
    }
  }, [isNew, createState, editState, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  async function handleDelete() {
    if (!event) return;
    if (!window.confirm("Excluir este evento e as inscrições dele? Esta ação não pode ser desfeita.")) return;
    const f = new FormData();
    f.set("id", event.id);
    await deleteEventAction(f);
    onClose();
    router.push("/events");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={isNew ? createAction : editAction}>
        <h3>{isNew ? "Novo evento" : "Editar evento"}</h3>
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={event?.name ?? ""} placeholder="Ex.: Conferência de Jovens" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="mrow">
          <div className="field"><label>Tipo</label><input name="type" defaultValue={event?.type ?? ""} placeholder="Ex.: Conferência, Retiro, Curso" /></div>
          <div className="field">
            <label>Campus</label>
            <select name="campus" defaultValue={event?.campus || activeCampus}>
              {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mrow">
          <div className="field"><label>Data</label><input name="event_date" type="date" defaultValue={event?.event_date ?? ""} /></div>
          <div className="field">
            <label>Status</label>
            <select name="status" defaultValue={event?.status ?? "active"}>
              {Object.entries(STATUS_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="mrow">
          <div className="field"><label>Início</label><input name="start_time" type="time" defaultValue={event?.start_time ?? ""} /></div>
          <div className="field"><label>Fim</label><input name="end_time" type="time" defaultValue={event?.end_time ?? ""} /></div>
        </div>
        <div className="mrow">
          <div className="field"><label>Local</label><input name="location" defaultValue={event?.location ?? ""} placeholder="Opcional" /></div>
          <div className="field"><label>Capacidade</label><input name="capacity" type="number" min={0} defaultValue={event?.capacity ?? ""} placeholder="Opcional" /></div>
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea name="description" rows={2} defaultValue={event?.description ?? ""} placeholder="Opcional" />
        </div>
        <label className="field check"><input type="checkbox" name="registration_required" defaultChecked={event ? event.registration_required : true} /><span>Requer inscrição</span></label>
        <label className="field check"><input type="checkbox" name="check_in_enabled" defaultChecked={event ? event.check_in_enabled : true} /><span>Check-in ativo</span></label>
        <label className="field check"><input type="checkbox" name="payment_required" defaultChecked={event ? event.payment_required : false} /><span>Requer pagamento (registro interno; cobrança online é futura)</span></label>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          {event ? <button className="btn ghost" type="button" onClick={handleDelete} style={{ marginRight: "auto", color: "var(--danger, #c0392b)" }}>Excluir</button> : null}
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar evento" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
