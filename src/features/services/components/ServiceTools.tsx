"use client";

// Ações do detalhe do culto (Client — Server Actions): editar culto e registrar
// presença (check-in). O check-in usa recordServiceAttendanceAction → caminho
// compartilhado de presença (context_type='service').
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordServiceAttendanceAction } from "../actions";
import { ServiceModal } from "./ServiceModal";
import type { Service } from "../types";
import { type ActionResult } from "@/lib/errors";

export interface PersonLite {
  id: string;
  name: string;
}
const INITIAL: ActionResult = { success: true, data: undefined };

export function EditServiceButton({
  service,
  campuses,
  activeCampus,
}: {
  service: Service;
  campuses: string[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost" onClick={() => setOpen(true)}>Editar culto</button>
      {open ? <ServiceModal service={service} campuses={campuses} activeCampus={activeCampus} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function CheckinButton({
  serviceId,
  campus,
  people,
}: {
  serviceId: string;
  campus: string;
  people: PersonLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(recordServiceAttendanceAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const filtered = query
    ? people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : people;

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Registrar presença</button>
      {open ? (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="modal wide" action={formAction}>
            <h3>Registrar presença</h3>
            <div className="msub">{campus} · hoje · marque quem veio ao culto</div>
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="campus" value={campus} />
            <input className="searchbox" placeholder="Buscar pessoa..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div style={{ maxHeight: "46vh", overflow: "auto" }}>
              {people.length === 0 ? (
                <div className="empty">Nenhuma pessoa neste campus ainda.</div>
              ) : (
                people.map((p) => (
                  <label key={p.id} className="field check" style={{ padding: "6px 0", display: filtered.includes(p) ? "flex" : "none" }}>
                    <input type="checkbox" name="stick" value={p.id} />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
            {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar presença"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
