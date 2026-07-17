"use client";

// Editor de cargo (criar ou editar) — nome + checkboxes do catálogo, agrupados por
// assunto. Uma ação primária ("Salvar"/"Criar cargo"); cancelar é secundário.
// A validação de nome roda no cliente para avisar cedo; a action revalida no servidor.
import { useActionState, useEffect, useState } from "react";
import { PERMISSION_GROUPS, permissionsInGroup, validateRoleName } from "../domain";
import type { RoleRow } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../roles.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function RoleEditor({
  role,
  roles,
  action,
  onDone,
  onCancel,
}: {
  role?: RoleRow; // ausente = criando um cargo novo
  roles: RoleRow[];
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [name, setName] = useState(role?.name ?? "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (state.success && state !== INITIAL) onDone();
  }, [state, onDone]);

  const nameError = touched ? validateRoleName(name, roles, role?.id) : null;
  const serverError = !state.success ? state.message : null;

  return (
    <form action={formAction} className={styles.editor}>
      {role ? <input type="hidden" name="id" value={role.id} /> : null}

      <div className="field">
        <label htmlFor="role-name">Nome do cargo</label>
        <input
          id="role-name"
          name="name"
          className={styles.editorName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Ex.: Recepção"
          autoFocus
        />
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group} className={styles.permGroup}>
          <legend className={styles.permGroupTitle}>{group}</legend>
          {permissionsInGroup(group).map((p) => (
            <label key={p.key} className={styles.permItem}>
              <input type="checkbox" name="perm" value={p.key} defaultChecked={role?.permissions.includes(p.key)} />
              <span className={styles.permText}>
                {p.label}
                {p.hint ? <small>{p.hint}</small> : null}
              </span>
            </label>
          ))}
        </fieldset>
      ))}

      {nameError || serverError ? <div className="gerr">{nameError ?? serverError}</div> : null}

      <div className={styles.editorActions}>
        <button className="btn" type="submit" disabled={pending || Boolean(nameError)}>
          {pending ? "Salvando…" : role ? "Salvar" : "Criar cargo"}
        </button>
        <button className="link" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
