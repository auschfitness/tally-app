"use client";

// Aba Instituição (Client — Server Action). Uma igreja = um local, uma conta = uma
// igreja: só nome e moeda da organização (tabela organizations). A gestão de campus e
// o toggle multi-instituição saíram da UI (o banco os mantém dormentes).
import { Select } from "@/components/shared/Select";
import { useActionState } from "react";
import { CURRENCIES } from "../domain";
import { updateOrgAction } from "../actions";
import { type ActionResult } from "@/lib/errors";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function InstitutionPanel({ orgName, currency }: { orgName: string; currency: string }) {
  const [orgState, orgAction, orgPending] = useActionState(updateOrgAction, INITIAL);

  const orgErr = orgState.success ? undefined : orgState.fieldErrors;

  return (
    <div className="panel">
      {/* Nome + moeda (organizations) */}
      <form action={orgAction} className={styles.setrow}>
        <div className={styles.lbl}>Instituição<small>Nome e moeda (usada no Finance Lite)</small></div>
        <div className={styles.ctrl}>
          <input name="name" defaultValue={orgName} placeholder="Nome da instituição" />
          {orgErr?.name ? <div className="gerr">{orgErr.name[0]}</div> : null}
          <Select name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          {!orgState.success && orgState.message ? <div className="gerr">{orgState.message}</div> : null}
          <div><button className="btn" type="submit" disabled={orgPending}>{orgPending ? "Salvando…" : "Salvar"}</button></div>
        </div>
      </form>
    </div>
  );
}
