"use client";

// Modal "Atribuir Care" (Client — Server Action). Cria um care_item a partir do
// signal e marca o override como `assigned`. Prioridade herda o nível do signal
// (attention/notice/celebration são valores válidos de care priority).
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { assignCareFromSignalAction } from "../actions";
import type { Signal } from "@/features/signals/domain";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function AssignCareModal({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(assignCareFromSignalAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={action}>
        <h3>Atribuir Care</h3>
        <div className="msub">{signal.title}</div>
        <input type="hidden" name="signalKey" value={signal.key} />
        <input type="hidden" name="title" value={signal.title} />
        <input type="hidden" name="priority" value={signal.level} />
        {signal.stickId ? <input type="hidden" name="stickId" value={signal.stickId} /> : null}
        <div className="field">
          <label>Contexto / próxima ação</label>
          <textarea name="description" rows={3} defaultValue={signal.why.join(" · ")} placeholder="O que fazer a respeito" autoFocus />
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Criando…" : "Criar Care"}</button>
        </div>
      </form>
    </div>
  );
}
