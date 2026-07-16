"use client";

// Ações do detalhe do evento (Client — Server Actions): editar e inscrever.
// Inscrever vincula uma Stick existente OU registra visitante novo (sem criar Stick).
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addRegistrationAction } from "../actions";
import { EventModal } from "./EventModal";
import type { EventItem } from "../types";
import { type ActionResult } from "@/lib/errors";

export interface RegPersonOption {
  id: string;
  name: string;
  label: string; // "Nome (Membro)"
}
const INITIAL: ActionResult = { success: true, data: undefined };

export function EditEventButton({
  event,
  campuses,
  activeCampus,
}: {
  event: EventItem;
  campuses: string[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost" onClick={() => setOpen(true)}>Editar</button>
      {open ? <EventModal event={event} campuses={campuses} activeCampus={activeCampus} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function RegisterButton({ eventId, people }: { eventId: string; people: RegPersonOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addRegistrationAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Inscrever</button>
      {open ? (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="modal" action={formAction}>
            <h3>Inscrever no evento</h3>
            <input type="hidden" name="eventId" value={eventId} />
            <div className="field">
              <label>Pessoa conhecida (Stick)</label>
              <Select name="stickId" defaultValue="">
                <option value="">— Visitante novo (não vincular) —</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
            <div className="msub" style={{ margin: "2px 0 10px" }}>
              Se for visitante novo, deixe acima em “Visitante novo” e preencha abaixo — não criamos uma Stick duplicada aqui.
            </div>
            <div className="field">
              <label>Nome (visitante)</label>
              <input name="name" placeholder="Nome de quem não é Stick ainda" />
              {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
            </div>
            <div className="mrow">
              <div className="field"><label>E-mail</label><input name="email" placeholder="Opcional" /></div>
              <div className="field"><label>Telefone</label><input name="phone" placeholder="Opcional" /></div>
            </div>
            <label className="field check"><input type="checkbox" name="checkedIn" /><span>Já marcar presença (check-in)</span></label>
            {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn" type="submit" disabled={pending}>{pending ? "Inscrevendo…" : "Inscrever"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
