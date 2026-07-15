"use client";

// Modal de criar Trilha (Client — Server Action). Ao criar, navega para o detalhe
// da nova trilha. Espelha o SeriesModal (padrão useActionState + router.push).
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrackAction } from "../actions";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult<{ id: string }> = { success: true, data: { id: "" } };

export function NewTrackModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTrackAction, INITIAL);

  useEffect(() => {
    if (state.success && state.data.id) {
      onClose();
      router.push(`/tracks/${state.data.id}`);
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={action}>
        <h3>Nova trilha</h3>
        <div className="field">
          <label>Nome</label>
          <input name="name" placeholder="Ex.: Fundamentos da Fé" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="field">
          <label>Descrição (opcional)</label>
          <input name="description" placeholder="Para quem é / objetivo" />
        </div>
        <div className="field">
          <label>Tipo (opcional)</label>
          <input name="type" placeholder="Ex.: Novo convertido" />
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Criando…" : "Criar trilha"}</button>
        </div>
      </form>
    </div>
  );
}
