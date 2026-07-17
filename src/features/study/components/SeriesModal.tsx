"use client";

// Modal de criar/editar Série (Client — Server Actions). Ao criar, navega para o
// workspace da nova série.
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSeriesAction, updateSeriesAction } from "../actions";
import { SERIES_LBL } from "../domain";
import type { Series } from "../types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult<{ id: string }> = { success: true, data: { id: "" } };
const INITIAL_EDIT: ActionResult = { success: true, data: undefined };

export function SeriesModal({ series, onClose }: { series?: Series; onClose: () => void }) {
  const router = useRouter();
  const isNew = !series;
  const [createState, createAction, creating] = useActionState(createSeriesAction, INITIAL);
  const [editState, editAction, editing] = useActionState(updateSeriesAction, INITIAL_EDIT);
  const state = isNew ? createState : editState;
  const pending = isNew ? creating : editing;

  useEffect(() => {
    if (isNew) {
      if (createState.success && createState.data.id) {
        onClose();
        router.push(`/study/series/${createState.data.id}`);
      }
    } else if (editState.success && editState !== INITIAL_EDIT) {
      onClose();
      router.refresh();
    }
  }, [isNew, createState, editState, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={isNew ? createAction : editAction}>
        <h3>{isNew ? "Nova série" : "Editar série"}</h3>
        {series ? <input type="hidden" name="id" value={series.id} /> : null}
        <div className="field">
          <label>Título</label>
          <input name="title" defaultValue={series?.title ?? ""} placeholder="Ex.: O Bom Pastor" autoFocus />
          {fieldErrors?.title ? <div className="gerr">{fieldErrors.title[0]}</div> : null}
        </div>
        <div className="field">
          <label>Visão / descrição</label>
          <textarea name="description" rows={3} defaultValue={series?.description ?? ""} placeholder="Para onde esta série leva a igreja" />
        </div>
        <div className="field">
          <label>Tema</label>
          <input name="theme" defaultValue={series?.theme ?? ""} placeholder="Ex.: Identidade em Cristo" />
        </div>
        <div className="mrow">
          <div className="field"><label>Início</label><DateField name="start_date" defaultValue={series?.start_date ?? ""} /></div>
          <div className="field"><label>Fim</label><DateField name="end_date" defaultValue={series?.end_date ?? ""} /></div>
        </div>
        <div className="field">
          <label>Status</label>
          <Select name="status" defaultValue={series?.status ?? "planning"}>
            {Object.entries(SERIES_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar série" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
