"use client";

// Modal de criar/editar Time (Client — Server Actions). Ao criar, navega para o
// detalhe do novo time (paridade com o legado, que abria o time recém-criado).
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTeamAction, updateTeamAction, deleteTeamAction } from "../actions";
import { TEAM_STATUS_LBL } from "../domain";
import type { Ministry, Team } from "../types";
import type { PersonOption } from "./types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult<{ id: string }> = { success: true, data: { id: "" } };
const INITIAL_EDIT: ActionResult = { success: true, data: undefined };

export function TeamModal({
  team,
  ministries,
  people,
  campuses,
  activeCampus,
  onClose,
}: {
  team?: Team;
  ministries: Ministry[];
  people: PersonOption[];
  campuses: string[];
  activeCampus: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = !team;
  const [createState, createAction, creating] = useActionState(createTeamAction, INITIAL);
  const [editState, editAction, editing] = useActionState(updateTeamAction, INITIAL_EDIT);
  const state = isNew ? createState : editState;
  const pending = isNew ? creating : editing;

  useEffect(() => {
    if (isNew) {
      if (createState.success && createState.data.id) {
        onClose();
        router.push(`/teams/${createState.data.id}`);
      }
    } else if (editState.success && editState !== INITIAL_EDIT) {
      onClose();
      router.refresh();
    }
  }, [isNew, createState, editState, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  async function handleDelete() {
    if (!team) return;
    if (!window.confirm("Excluir este time? Os vínculos de serviço dele são removidos junto. Esta ação não pode ser desfeita.")) return;
    const fd = new FormData();
    fd.set("id", team.id);
    await deleteTeamAction(fd);
    onClose();
    router.push("/teams");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={isNew ? createAction : editAction}>
        <h3>{isNew ? "Novo time" : "Editar time"}</h3>
        {team ? <input type="hidden" name="id" value={team.id} /> : null}
        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={team?.name ?? ""} placeholder="Ex.: Banda" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>
        <div className="mrow">
          <div className="field">
            <label>Ministério</label>
            <Select name="ministryId" defaultValue={team?.ministry_id ?? ""}>
              <option value="">Sem ministério</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Status</label>
            <Select name="status" defaultValue={team?.status ?? "active"}>
              {Object.entries(TEAM_STATUS_LBL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea name="description" rows={2} defaultValue={team?.description ?? ""} placeholder="O que este time faz" />
        </div>
        <div className="field">
          <label>Papéis de serviço (vírgula)</label>
          <input name="servingRoles" defaultValue={(team?.serving_roles ?? []).join(", ")} placeholder="Vocal, Guitarra, Mesa de som" />
        </div>
        <div className="mrow">
          <div className="field">
            <label>Líder</label>
            <Select name="leaderStickId" defaultValue={team?.leader_id ?? ""}>
              <option value="">Sem líder</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Campus</label>
            <Select name="campus" defaultValue={team?.campus || activeCampus}>
              {campuses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          {team ? <button className="btn ghost" type="button" onClick={handleDelete} style={{ marginRight: "auto", color: "var(--danger, #c0392b)" }}>Excluir</button> : null}
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Criar" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
