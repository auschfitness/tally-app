"use client";

// Aba Instituição (Client — Server Actions). Nome/moeda (tabela organizations),
// campi (tabela campuses, add/remove) e multi-instituição (blob, owner-gated).
import { Select } from "@/components/shared/Select";
import { useActionState } from "react";
import { CURRENCIES } from "../domain";
import { updateOrgAction, setMultiInstitutionAction } from "../actions";
import { CampusManager } from "./CampusManager";
import type { CampusRow, InstitutionConfig } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function InstitutionPanel({
  orgName,
  currency,
  campuses,
  institution,
  isOwner,
}: {
  orgName: string;
  currency: string;
  campuses: CampusRow[];
  institution: InstitutionConfig;
  isOwner: boolean;
}) {
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

      {/* Campus (campuses) — gestão: listar/renomear/remover/adicionar */}
      <div className={styles.setrow}>
        <div className={styles.lbl}>Campus<small>Cada campus tem seus dados e presença. Troque o campus ativo no seletor do topo.</small></div>
        <CampusManager campuses={campuses} />
      </div>

      {/* Multi-instituição (blob, só owner) */}
      <div className={styles.setrow}>
        <div className={styles.lbl}>Multi-instituição<small>Gerir mais de uma igreja na mesma conta</small></div>
        <div className={styles.ctrl}>
          {isOwner ? (
            <form action={setMultiInstitutionAction}>
              <input type="hidden" name="value" value={institution.multiInstitution ? "0" : "1"} />
              <button type="submit" className={`switch${institution.multiInstitution ? " on" : ""}`} aria-label="Alternar multi-instituição" />
            </form>
          ) : (
            <span className="muted">Apenas o dono da conta pode ativar</span>
          )}
        </div>
      </div>
    </div>
  );
}
