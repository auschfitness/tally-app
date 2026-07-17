"use client";

// Cargos da igreja: uma linha por cargo (nome + o que ele permite + quantas pessoas).
// Editar/Novo abrem o RoleEditor (revelação progressiva — a tela abre só com a lista).
// Excluir só aparece em cargo PERSONALIZADO: o RLS proíbe excluir os de sistema, então
// oferecer o botão seria prometer o que o banco recusa.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "../actions";
import { describeRole } from "../domain";
import type { RoleRow } from "../types";
import { type ActionResult } from "@/lib/errors";
import { RoleEditor } from "./RoleEditor";
import styles from "../roles.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function RoleList({ roles, canManage }: { roles: RoleRow[]; canManage: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: "idle" } | { kind: "new" } | { kind: "edit"; id: string }>({ kind: "idle" });
  const [rmState, rmAction] = useActionState(deleteRoleAction, INITIAL);

  useEffect(() => {
    if (rmState.success && rmState !== INITIAL) router.refresh();
  }, [rmState, router]);

  const close = () => {
    setMode({ kind: "idle" });
    router.refresh();
  };

  return (
    <>
      <div className={styles.section}>Cargos</div>
      <ul className={styles.list} aria-label="Cargos da igreja">
        {roles.map((r) =>
          mode.kind === "edit" && mode.id === r.id ? (
            <li key={r.id}>
              <RoleEditor role={r} roles={roles} action={updateRoleAction} onDone={close} onCancel={() => setMode({ kind: "idle" })} />
            </li>
          ) : (
            <li key={r.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowName}>
                  {r.name}
                  {r.is_system ? <span className={styles.badge}>padrão</span> : null}
                </div>
                {/* title: cargo cheio (ex.: Pastor) não cabe numa linha — o resumo
                    trunca e o texto completo aparece no hover. */}
                <div className={styles.rowSub} title={describeRole(r)}>{describeRole(r)}</div>
              </div>
              <div className={styles.rowActions}>
                <span className="muted">{r.memberCount === 1 ? "1 pessoa" : `${r.memberCount} pessoas`}</span>
                {canManage ? (
                  <>
                    <button className="link" type="button" onClick={() => setMode({ kind: "edit", id: r.id })}>Editar</button>
                    {r.is_system ? null : (
                      <form action={rmAction} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="link" type="submit" aria-label={`Excluir ${r.name}`}>Excluir</button>
                      </form>
                    )}
                  </>
                ) : null}
              </div>
            </li>
          ),
        )}
      </ul>
      {!rmState.success ? <div className="gerr">{rmState.message}</div> : null}

      {canManage ? (
        mode.kind === "new" ? (
          <RoleEditor roles={roles} action={createRoleAction} onDone={close} onCancel={() => setMode({ kind: "idle" })} />
        ) : (
          <button className="btn ghost sm" type="button" style={{ marginTop: 12 }} onClick={() => setMode({ kind: "new" })}>
            + Novo cargo
          </button>
        )
      ) : null}
    </>
  );
}
