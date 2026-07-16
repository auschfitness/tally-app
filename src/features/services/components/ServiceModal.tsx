"use client";

// Modal de criar/editar Culto (Client — Server Actions). Ao criar, navega para o
// detalhe do novo culto (paridade com o legado).
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createServiceAction, updateServiceAction, deleteServiceAction } from "../actions";
import { PATTERN_LBL, WD } from "../domain";
import type { Service } from "../types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult<{ id: string }> = { success: true, data: { id: "" } };
const INITIAL_EDIT: ActionResult = { success: true, data: undefined };

export function ServiceModal({
  service,
  campuses,
  activeCampus,
  onClose,
}: {
  service?: Service;
  campuses: string[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !service;
  const [createState, createAction, creating] = useActionState(createServiceAction, INITIAL);
  const [editState, editAction, editing] = useActionState(updateServiceAction, INITIAL_EDIT);
  const state = isNew ? createState : editState;
  const pending = isNew ? creating : editing;

  useEffect(() => {
    if (isNew) {
      if (createState.success && createState.data.id) {
        onClose();
        router.push(`/services/${createState.data.id}`);
      }
    } else if (editState.success && editState !== INITIAL_EDIT) {
      onClose();
      router.refresh();
    }
  }, [isNew, createState, editState, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  async function handleDelete() {
    if (!service) return;
    if (!window.confirm("Excluir este culto? A ordem do culto e as escalas ligadas a ele são removidas; as presenças registradas continuam, mas sem vínculo com o culto.")) return;
    const f = new FormData();
    f.set("id", service.id);
    await deleteServiceAction(f);
    onClose();
    router.push("/services");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={isNew ? createAction : editAction}>
        <h3>{isNew ? "Novo culto" : "Editar culto"}</h3>
        {service ? <input type="hidden" name="id" value={service.id} /> : null}
        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={service?.name ?? ""} placeholder="Ex.: Culto de Domingo" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="mrow">
          <div className="field">
            <label>Tipo</label>
            <input name="type" defaultValue={service?.type ?? ""} placeholder="Ex.: Domingo, Oração, Jovens" />
          </div>
          <div className="field">
            <label>Campus</label>
            <Select name="campus" defaultValue={service?.campus || activeCampus}>
              {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
        <div className="mrow">
          <div className="field">
            <label>Dia da semana</label>
            <Select name="weekday" defaultValue={service?.weekday ?? ""}>
              <option value="">—</option>
              {WD.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </Select>
          </div>
          <div className="field">
            <label>Recorrência</label>
            <Select name="recurring_pattern" defaultValue={service?.recurring_pattern ?? "weekly"}>
              {Object.entries(PATTERN_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>
        <div className="mrow">
          <div className="field"><label>Início</label><input name="start_time" type="time" defaultValue={service?.start_time ?? ""} /></div>
          <div className="field"><label>Fim</label><input name="end_time" type="time" defaultValue={service?.end_time ?? ""} /></div>
        </div>
        <div className="field">
          <label>Local</label>
          <input name="location" defaultValue={service?.location ?? ""} placeholder="Ex.: Templo, Salão" />
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea name="description" rows={2} defaultValue={service?.description ?? ""} placeholder="Opcional" />
        </div>
        <label className="field check">
          <input type="checkbox" name="active" defaultChecked={service ? service.active : true} />
          <span>Culto ativo</span>
        </label>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          {service ? <button className="btn ghost" type="button" onClick={handleDelete} style={{ marginRight: "auto", color: "var(--danger, #c0392b)" }}>Excluir</button> : null}
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar culto" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
