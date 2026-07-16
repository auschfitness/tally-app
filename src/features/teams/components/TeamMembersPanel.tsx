"use client";

// Painel "Quem serve" do detalhe do time (Client — Server Actions): lista de
// membros com papel/status, ações (papel, tornar líder, remover) e o controle de
// adicionar pessoa. Modal de papel/estágio embutido.
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamMemberAction, removeTeamMemberAction, setTeamLeaderAction, updateTeamMemberAction } from "../actions";
import { DEV_LBL, DEV_SETTABLE, MEMBER_STATUS_LBL, devStage } from "../domain";
import type { LeadershipDev, Team, TeamMember } from "../types";
import type { PersonOption } from "./types";
import { initials } from "@/lib/utils/date";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function TeamMembersPanel({
  team,
  members,
  leadershipDev,
  nameByStick,
  availablePeople,
}: {
  team: Team;
  members: TeamMember[];
  leadershipDev: LeadershipDev;
  nameByStick: Record<string, string>;
  availablePeople: PersonOption[];
}) {
  const router = useRouter();
  const [addState, addAction, adding] = useActionState(addTeamMemberAction, INITIAL);
  const [roleMember, setRoleMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (addState.success && addState !== INITIAL) router.refresh();
  }, [addState, router]);

  const roleList = team.serving_roles ?? [];
  const shown = members.filter((m) => m.status !== "inactive").length;

  function nameOf(id: string): string {
    return nameByStick[id] ?? "—";
  }

  async function confirmRemove(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remover esta pessoa do time?")) {
      e.preventDefault();
      return;
    }
    // deixa o form action rodar; refresh vem do revalidatePath + router
    setTimeout(() => router.refresh(), 400);
  }

  return (
    <div className="panel">
      <div className="ph"><h3>Quem serve</h3><span className="muted" style={{ marginLeft: "auto" }}>{shown}</span></div>

      {members.length === 0 ? (
        <div className="empty">Ninguém serve neste time ainda. Ligue uma pessoa abaixo.</div>
      ) : (
        members.map((m) => {
          const nm = nameOf(m.stick_id);
          const isLead = team.leader_id === m.stick_id;
          const dev = devStage(m, team, leadershipDev);
          return (
            <div className="li" key={m.id}>
              <div className={`av${m.status === "active" ? "" : " c"}`}>{initials(nm)}</div>
              <div style={{ flex: 1 }}>
                <div>
                  <b>{nm}</b>
                  {isLead ? <span className="chip member" style={{ marginLeft: 6 }}>líder</span> : dev !== "serving" ? <span className="chip leader" style={{ marginLeft: 6 }}>{DEV_LBL[dev]}</span> : null}
                </div>
                <div className="meta">{m.role ? m.role + " · " : ""}{MEMBER_STATUS_LBL[m.status] || m.status}{m.availability ? " · " + m.availability : ""}</div>
              </div>
              <div className="right">
                <button className="btn ghost sm" onClick={() => setRoleMember(m)}>Papel</button>
                {isLead ? null : (
                  <form action={setTeamLeaderAction} style={{ display: "inline" }}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="stickId" value={m.stick_id} />
                    <button className="btn ghost sm" type="submit">Tornar líder</button>
                  </form>
                )}
                <form action={removeTeamMemberAction} style={{ display: "inline" }} onSubmit={confirmRemove}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <button className="link" type="submit">remover</button>
                </form>
              </div>
            </div>
          );
        })
      )}

      {availablePeople.length ? (
        <form className="mrow" style={{ marginTop: 12 }} action={addAction}>
          <input type="hidden" name="teamId" value={team.id} />
          <div className="field">
            <label>Ligar pessoa ao time</label>
            <Select name="stickId" defaultValue="">
              {availablePeople.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Papel</label>
            {roleList.length ? (
              <Select name="role" defaultValue="">
                <option value="">Papel (opcional)</option>
                {roleList.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            ) : (
              <input name="role" placeholder="Papel (opcional)" />
            )}
          </div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn ghost" type="submit" disabled={adding}>{adding ? "Adicionando…" : "Adicionar"}</button>
          </div>
        </form>
      ) : (
        <div className="muted" style={{ marginTop: 12 }}>Todo o campus já está neste time.</div>
      )}

      {roleMember ? (
        <MemberRoleModal team={team} member={roleMember} leadershipDev={leadershipDev} nameOf={nameOf} onClose={() => setRoleMember(null)} />
      ) : null}
    </div>
  );
}

function MemberRoleModal({
  team,
  member,
  leadershipDev,
  nameOf,
  onClose,
}: {
  team: Team;
  member: TeamMember;
  leadershipDev: LeadershipDev;
  nameOf: (id: string) => string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateTeamMemberAction, INITIAL);
  const dev = devStage(member, team, leadershipDev);
  const isLeader = dev === "leader";
  const roleList = team.serving_roles ?? [];

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{nameOf(member.stick_id)} — serviço</h3>
        <input type="hidden" name="memberId" value={member.id} />
        <input type="hidden" name="teamId" value={team.id} />
        <input type="hidden" name="isLeader" value={isLeader ? "1" : "0"} />
        <div className="field">
          <label>Papel</label>
          {roleList.length ? (
            <Select name="role" defaultValue={member.role}>
              <option value="">Nenhum</option>
              {roleList.map((r) => <option key={r} value={r}>{r}</option>)}
              {member.role && !roleList.includes(member.role) ? <option value={member.role}>{member.role}</option> : null}
            </Select>
          ) : (
            <input name="role" defaultValue={member.role} placeholder="Ex.: Vocal" />
          )}
        </div>
        <div className="mrow">
          <div className="field">
            <label>Status</label>
            <Select name="status" defaultValue={member.status}>
              {Object.entries(MEMBER_STATUS_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div className="field">
            <label>Disponibilidade</label>
            <input name="availability" defaultValue={member.availability} placeholder="Ex.: manhãs, quinzenal" />
          </div>
        </div>
        {isLeader ? (
          <div className="field">
            <label>Estágio de liderança</label>
            <div><span className="chip member">Líder</span> <span className="muted">(defina outro líder para mudar)</span></div>
          </div>
        ) : (
          <div className="field">
            <label>Estágio de liderança</label>
            <Select name="devStage" defaultValue={dev}>
              {Object.entries(DEV_SETTABLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        )}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
