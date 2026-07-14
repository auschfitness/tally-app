"use client";

// Controles interativos do board de Escala (Client — Server Actions): botão/modal
// de escalar, e por escalação o avanço de status e a remoção (com confirmação).
// O board em si é renderizado no servidor (RSC); aqui ficam só as folhas.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAssignmentAction, deleteAssignmentAction, setAssignmentStatusAction } from "../actions";
import { ASG_STATUS_BAND, ASG_STATUS_LBL, nextAssignmentStatus } from "../domain";
import type { AssignmentStatus, Team } from "../types";
import type { PersonOption } from "./types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function AssignButton({
  date,
  teams,
  people,
  variant = "link",
  label = "+ Escalar",
}: {
  date: string;
  teams: Team[];
  people: PersonOption[];
  variant?: "link" | "btn";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const usable = teams.filter((t) => t.status !== "archived");
  return (
    <>
      <button className={variant === "btn" ? "btn" : "link"} onClick={() => setOpen(true)}>{label}</button>
      {open ? <AssignModal date={date} teams={usable} people={people} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AssignModal({
  date,
  teams,
  people,
  onClose,
}: {
  date: string;
  teams: Team[];
  people: PersonOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createAssignmentAction, INITIAL);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (teams.length === 0) {
    return (
      <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <form className="modal">
          <h3>Escalar</h3>
          <div className="empty">Crie um time primeiro para montar a escala.</div>
          <div className="actions"><button className="btn" type="button" onClick={onClose}>Fechar</button></div>
        </form>
      </div>
    );
  }

  const roles = teams.find((t) => t.id === teamId)?.serving_roles ?? [];
  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Escalar serviço</h3>
        <div className="mrow">
          <div className="field">
            <label>Data</label>
            <input name="date" type="date" defaultValue={date} />
            {fieldErrors?.date ? <div className="gerr">{fieldErrors.date[0]}</div> : null}
          </div>
          <div className="field">
            <label>Time</label>
            <select name="teamId" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mrow">
          <div className="field">
            <label>Pessoa</label>
            <select name="stickId" defaultValue={people[0]?.id ?? ""}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {fieldErrors?.stickId ? <div className="gerr">{fieldErrors.stickId[0]}</div> : null}
          </div>
          <div className="field">
            <label>Papel</label>
            <input name="role" placeholder="Ex.: Vocal" list="as-roles" />
            <datalist id="as-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Escalando…" : "Escalar"}</button>
        </div>
      </form>
    </div>
  );
}

export function AssignmentControls({ id, status }: { id: string; status: AssignmentStatus }) {
  const router = useRouter();

  async function remove(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remover esta escalação?")) {
      e.preventDefault();
      return;
    }
    setTimeout(() => router.refresh(), 400);
  }

  return (
    <div className="right">
      <form action={setAssignmentStatusAction} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={nextAssignmentStatus(status)} />
        <button className={`hb ${ASG_STATUS_BAND[status] || "attention"}`} type="submit" title="Clique para avançar o status" style={{ cursor: "pointer", border: 0 }}>
          {ASG_STATUS_LBL[status] || status}
        </button>
      </form>
      <form action={deleteAssignmentAction} style={{ display: "inline" }} onSubmit={remove}>
        <input type="hidden" name="id" value={id} />
        <button className="link" type="submit">×</button>
      </form>
    </div>
  );
}
