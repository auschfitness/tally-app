"use client";

// Pessoas da equipe: quem tem acesso ao app (memberships), com o cargo de cada uma.
// Trocar o cargo grava memberships.role_id na hora (sem botão "salvar" — é um campo só).
// O DONO não tem seletor: quem manda nele é `memberships.is_owner`, que ignora o RLS —
// dar-lhe um cargo não mudaria nada e sugeriria um poder que a tela não tem.
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { assignRoleAction } from "../actions";
import type { MemberRow, RoleRow } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../roles.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function MemberList({ members, roles, canManage }: { members: MemberRow[]; roles: RoleRow[]; canManage: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(assignRoleAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) router.refresh();
  }, [state, router]);

  return (
    <>
      <div className={styles.section}>Pessoas com acesso</div>
      <ul className={styles.list} aria-label="Pessoas com acesso">
        {members.map((m) => (
          <li key={m.id} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowName}>
                {m.name}
                {m.isSelf ? <span className={styles.badge}>você</span> : null}
              </div>
              {/* Sem perfil preenchido, o nome JÁ é o e-mail — não repetir a linha. */}
              {m.email && m.email !== m.name ? <div className={styles.rowSub}>{m.email}</div> : null}
            </div>
            <div className={styles.memberRole}>
              {m.isOwner ? (
                <span className="muted">Dono — acesso total</span>
              ) : canManage ? (
                <RolePicker member={m} roles={roles} action={action} />
              ) : (
                <span className="muted">{roles.find((r) => r.id === m.roleId)?.name ?? "Sem cargo"}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!state.success ? <div className="gerr">{state.message}</div> : null}
    </>
  );
}

// Um <select> que envia o formulário ao mudar: trocar o cargo é a ação, não "escolher
// e depois salvar" (design-principles: uma ação clara, sem passo extra).
function RolePicker({ member, roles, action }: { member: MemberRow; roles: RoleRow[]; action: (fd: FormData) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="membershipId" value={member.id} />
      <Select
        name="roleId"
        compact
        defaultValue={member.roleId ?? ""}
        aria-label={`Cargo de ${member.name}`}
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">Sem cargo</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </Select>
    </form>
  );
}
