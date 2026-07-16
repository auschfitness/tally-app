"use client";

// Modal de criar/editar Ministério (Client — Server Actions).
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createMinistryAction, updateMinistryAction, deleteMinistryAction } from "../actions";
import { MIN_STATUS_LBL } from "../domain";
import type { Ministry } from "../types";
import type { PersonOption } from "./types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function MinistryModal({
  ministry,
  people,
  activeCampus,
  onClose,
}: {
  ministry?: Ministry;
  people: PersonOption[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !ministry;
  const [state, formAction, pending] = useActionState(isNew ? createMinistryAction : updateMinistryAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  async function handleDelete() {
    if (!ministry) return;
    // FK ON DELETE CASCADE: apagar o ministério apaga os times dele e os vínculos.
    if (!window.confirm("Excluir este ministério apaga também os times dele e os vínculos de serviço. Esta ação não pode ser desfeita.")) return;
    const fd = new FormData();
    fd.set("id", ministry.id);
    await deleteMinistryAction(fd);
    onClose();
    router.push("/teams");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{isNew ? "Novo ministério" : "Editar ministério"}</h3>
        {ministry ? <input type="hidden" name="id" value={ministry.id} /> : null}
        <input type="hidden" name="campus" value={ministry?.campus || activeCampus} />
        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={ministry?.name ?? ""} placeholder="Ex.: Louvor" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea name="description" rows={2} defaultValue={ministry?.description ?? ""} placeholder="O que este ministério cuida" />
        </div>
        <div className="mrow">
          <div className="field">
            <label>Líder</label>
            <Select name="leaderStickId" defaultValue={ministry?.leader_id ?? ""}>
              <option value="">Sem líder</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Status</label>
            <Select name="status" defaultValue={ministry?.status ?? "active"}>
              {Object.entries(MIN_STATUS_LBL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          {ministry ? <button className="btn ghost" type="button" onClick={handleDelete} style={{ marginRight: "auto", color: "var(--danger, #c0392b)" }}>Excluir</button> : null}
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
