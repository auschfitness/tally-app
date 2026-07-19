"use client";

import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStickAction, updateStickAction, archiveStickAction } from "../actions";
import { RELATIONSHIPS, relLabelFull } from "../domain";
import type { Person } from "../types";
import { createInvite } from "@/features/invites/actions";
import { inviteUrl } from "@/features/invites/domain";
import { type ActionResult } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";

const INITIAL: ActionResult = { success: true, data: undefined };

export function PersonModal({
  person,
  groups,
  campuses,
  activeCampus,
  canManageMembers,
  hasPendingInvite,
  onClose,
}: {
  person: Person | null;
  groups: string[];
  campuses: string[];
  activeCampus: string;
  canManageMembers: boolean;
  hasPendingInvite: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    person ? updateStickAction : createStickAction,
    INITIAL,
  );

  // Convite (fluxo à parte do salvar): cria o convite e mostra o link para copiar.
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sucesso de uma submissão real (o estado inicial também é success, mas é a MESMA
  // referência INITIAL) → fecha o modal e recarrega os dados revalidados na action.
  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  async function handleArchive() {
    if (!person) return;
    const fd = new FormData();
    fd.set("id", person.id);
    await archiveStickAction(fd);
    onClose();
    router.refresh();
  }

  async function handleInvite() {
    if (!person) return;
    setInviting(true);
    setInviteErr(null);
    const res = await createInvite(person.id);
    setInviting(false);
    if (res.success) {
      setInviteLink(inviteUrl(window.location.origin, res.data.token));
      router.refresh();
    } else {
      setInviteErr(res.message);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const savedEmail = (person?.email ?? "").trim();

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{person ? "Editar Stick" : "Nova Stick"}</h3>
        {person ? <input type="hidden" name="id" value={person.id} /> : null}

        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={person?.name ?? ""} placeholder="Nome completo" autoFocus />
          {fieldErrors?.name ? <div className="gerr">{fieldErrors.name[0]}</div> : null}
        </div>

        <div className="field">
          <label>E-mail</label>
          <input
            name="email"
            type="email"
            defaultValue={person?.email ?? ""}
            placeholder="Opcional — necessário para convidar ao app"
          />
          {fieldErrors?.email ? <div className="gerr">{fieldErrors.email[0]}</div> : null}
        </div>

        <div className="mrow">
          <div className="field">
            <label>Relação</label>
            <Select name="relationship" defaultValue={person?.relationship ?? "member"}>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {relLabelFull(r)}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Campus</label>
            <Select name="campus" defaultValue={person?.campus || activeCampus}>
              {campuses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mrow">
          <div className="field">
            <label>Grupo</label>
            <Select name="group" defaultValue={person?.group ?? ""}>
              <option value="">(nenhum)</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Última presença</label>
            <DateField name="lastSeen" defaultValue={person?.lastSeen || isoDate(today())} />
            {fieldErrors?.lastSeen ? <div className="gerr">{fieldErrors.lastSeen[0]}</div> : null}
          </div>
        </div>

        <div className="field check">
          <input type="checkbox" name="isLeader" defaultChecked={person?.isLeader ?? false} id="pm-leader" />
          <label htmlFor="pm-leader">É líder</label>
        </div>
        <div className="field check">
          <input type="checkbox" name="followup" defaultChecked={person?.followup ?? false} id="pm-followup" />
          <label htmlFor="pm-followup">Follow-up em aberto</label>
        </div>

        {/* Acesso ao app: só para fichas existentes e quem gerencia membros. */}
        {person && canManageMembers ? (
          <div className="field" style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
            <label>Acesso ao app</label>
            {person.userId ? (
              <div className="muted">Esta pessoa já tem acesso ao app.</div>
            ) : inviteLink ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="muted">Convite criado. Copie o link e envie para a pessoa:</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} />
                  <button className="btn ghost" type="button" onClick={copyLink}>
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : hasPendingInvite ? (
              <div className="muted">
                Já há um convite pendente — gerencie (revogar / novo link) em <b>Membros</b>.
              </div>
            ) : savedEmail ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn" type="button" onClick={handleInvite} disabled={inviting}>
                  {inviting ? "Criando convite…" : "Convidar para o app"}
                </button>
                <span className="muted" style={{ fontSize: 12.5 }}>Convite para {savedEmail}</span>
              </div>
            ) : (
              <div className="muted">Adicione um e-mail acima e salve para poder convidar.</div>
            )}
            {inviteErr ? <div className="gerr">{inviteErr}</div> : null}
          </div>
        ) : null}

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}

        <div className="actions">
          {person ? (
            <button className="btn danger" type="button" onClick={handleArchive} disabled={pending}>
              Arquivar
            </button>
          ) : null}
          <button className="btn ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
