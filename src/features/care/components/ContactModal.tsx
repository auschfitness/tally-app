"use client";

// Modal de registrar contato (Client — Server Action). Ao salvar, o item vira
// "resolvido" (checkbox) ou "em andamento". Espelha o contactModal do legado.
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DateField } from "@/components/shared/DateField";
import { addCareContactAction } from "../actions";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function ContactModal({ careItemId, onClose }: { careItemId: string; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addCareContactAction, INITIAL);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={action}>
        <h3>Registrar contato</h3>
        <input type="hidden" name="careItemId" value={careItemId} />
        <div className="field">
          <label>O que aconteceu</label>
          <input name="note" placeholder="Ex.: Liguei, conversamos sobre…" autoFocus />
        </div>
        <div className="mrow">
          <div className="field"><label>Data</label><DateField name="contactedOn" defaultValue={today} /></div>
          <div className="field"><label>Meio (opcional)</label><input name="method" placeholder="Ligação, visita…" /></div>
        </div>
        <div className="field check">
          <input type="checkbox" id="resolve" name="resolve" />
          <label htmlFor="resolve">Marcar como resolvido</label>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
