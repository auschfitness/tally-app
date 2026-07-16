"use client";

// Aba Instituição (Client — Server Actions). Nome/moeda (tabela organizations),
// campi (tabela campuses, add/remove) e multi-instituição (blob, owner-gated).
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "../domain";
import { updateOrgAction, addCampusAction, removeCampusAction, setMultiInstitutionAction } from "../actions";
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
  const router = useRouter();
  const [orgState, orgAction, orgPending] = useActionState(updateOrgAction, INITIAL);
  const [addState, addAction, addPending] = useActionState(addCampusAction, INITIAL);
  const [rmState, rmAction] = useActionState(removeCampusAction, INITIAL);
  const addRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState.success && addState !== INITIAL) {
      addRef.current?.reset();
      router.refresh();
    }
  }, [addState, router]);
  useEffect(() => {
    if (rmState.success && rmState !== INITIAL) router.refresh();
  }, [rmState, router]);

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

      {/* Campus (campuses) */}
      <div className={styles.setrow}>
        <div className={styles.lbl}>Campus<small>Cada campus tem seus dados e presença</small></div>
        <div className={styles.ctrl}>
          <div className={styles.taglist}>
            {campuses.map((c) => (
              <span key={c.id} className={styles.tagx}>
                {c.name}
                <form action={rmAction} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label={`Remover ${c.name}`}>×</button>
                </form>
              </span>
            ))}
          </div>
          {!rmState.success && rmState.message ? <div className="gerr">{rmState.message}</div> : null}
          <form action={addAction} ref={addRef} className={styles.addRow}>
            <input name="name" placeholder="Novo campus" />
            <button className="btn ghost sm" type="submit" disabled={addPending}>{addPending ? "…" : "+ Adicionar"}</button>
          </form>
          {!addState.success && addState.message ? <div className="gerr">{addState.message}</div> : null}
        </div>
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
