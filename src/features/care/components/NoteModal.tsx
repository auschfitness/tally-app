"use client";

// Modal de nota interna (Client — Server Action). `care_notes` não existia na UI
// legada (só havia o log de contatos); é uma adição do modelo relacional para
// registro pastoral. `visibility` é rótulo (não RLS) — ver README.
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addCareNoteAction } from "../actions";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function NoteModal({ careItemId, onClose }: { careItemId: string; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addCareNoteAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={action}>
        <h3>Nota interna</h3>
        <input type="hidden" name="careItemId" value={careItemId} />
        <div className="field">
          <label>Nota</label>
          <textarea name="content" rows={3} placeholder="Registro pastoral desta situação" autoFocus />
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar nota"}</button>
        </div>
      </form>
    </div>
  );
}
