"use client";

// Editor de nota (modal — Client + Server Actions). Vínculos opcionais e escopo.
// Excluir quando já existe.
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createNoteAction, updateNoteAction, deleteNoteAction } from "../actions";
import { NOTE_SCOPE_LBL } from "../domain";
import type { StudyNote } from "../types";
import { type ActionResult } from "@/lib/errors";

export interface LinkOption {
  id: string;
  title: string;
}
const INITIAL: ActionResult = { success: true, data: undefined };

export function NoteModal({
  note,
  sermons,
  series,
  onClose,
}: {
  note?: StudyNote;
  sermons: LinkOption[];
  series: LinkOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !note;
  const [state, formAction, pending] = useActionState(isNew ? createNoteAction : updateNoteAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  async function handleDelete() {
    if (!note) return;
    if (!window.confirm("Excluir esta nota?")) return;
    const f = new FormData();
    f.set("id", note.id);
    await deleteNoteAction(f);
    onClose();
    router.refresh();
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{isNew ? "Nova nota" : "Editar nota"}</h3>
        {note ? <input type="hidden" name="id" value={note.id} /> : null}
        <div className="field">
          <label>Título</label>
          <input name="title" defaultValue={note?.title ?? ""} placeholder="Ex.: Reflexão sobre João 10" autoFocus />
          {fieldErrors?.title ? <div className="gerr">{fieldErrors.title[0]}</div> : null}
        </div>
        <div className="field">
          <label>Conteúdo</label>
          <textarea name="content" rows={6} defaultValue={note?.content ?? ""} placeholder="Escreva livremente…" />
        </div>
        <div className="mrow">
          <div className="field">
            <label>Escopo</label>
            <Select name="scope" defaultValue={note?.scope ?? "personal"}>
              {Object.entries(NOTE_SCOPE_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div className="field"><label>Tópico</label><input name="topic" defaultValue={note?.topic ?? ""} placeholder="Opcional" /></div>
        </div>
        <div className="mrow">
          <div className="field">
            <label>Sermão</label>
            <Select name="sermonId" defaultValue={note?.sermon_id ?? ""}>
              <option value="">Nenhum</option>
              {sermons.map((s) => <option key={s.id} value={s.id}>{s.title || "(sem título)"}</option>)}
            </Select>
          </div>
          <div className="field">
            <label>Série</label>
            <Select name="seriesId" defaultValue={note?.series_id ?? ""}>
              <option value="">Nenhuma</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.title || "(sem título)"}</option>)}
            </Select>
          </div>
        </div>
        <div className="mrow">
          <div className="field"><label>Escritura</label><input name="scriptureRef" defaultValue={note?.scripture_ref ?? ""} placeholder="Ex.: João 10:1-18" /></div>
          <div className="field"><label>Tags (vírgula)</label><input name="tags" defaultValue={(note?.tags ?? []).join(", ")} placeholder="graça, pastoreio" /></div>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          {note ? <button className="btn ghost" type="button" onClick={handleDelete} style={{ marginRight: "auto", color: "var(--danger, #c0392b)" }}>Excluir</button> : null}
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar nota" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
