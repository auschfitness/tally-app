"use client";

// Aba Jurídico (Client — Server Action). Dados fiscais da organização
// (org_fiscal_profiles). Uma igreja = um local: não há mais seletor de entidade
// (matriz/filial) nem alternador BR/EUA — o formulário é DIRIGIDO pelo país da
// organização (organizations.country), definido no cadastro. Leitura para qualquer
// membro; escrita só p/ dono/pastor/tesoureiro (canManage) — a UI desabilita o resto.
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveFiscalAction } from "../actions";
import { type FiscalCountry, type FiscalProfile } from "../fiscal";
import type { FiscalData } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function FiscalPanel({ fiscal, canManage }: { fiscal: FiscalData; canManage: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveFiscalAction, INITIAL);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      setJustSaved(true);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="panel">
      {!canManage ? (
        <div className={styles.fiscalNote}>Você pode ver os dados jurídicos. Só o dono, o pastor ou o tesoureiro pode editar.</div>
      ) : null}

      <FiscalForm
        country={fiscal.country}
        profile={fiscal.org}
        canManage={canManage}
        action={action}
        pending={pending}
        errorMsg={!state.success ? state.message : null}
        justSaved={justSaved}
      />
    </div>
  );
}

function FiscalForm({
  country,
  profile,
  canManage,
  action,
  pending,
  errorMsg,
  justSaved,
}: {
  country: FiscalCountry;
  profile: FiscalProfile;
  canManage: boolean;
  action: (fd: FormData) => void;
  pending: boolean;
  errorMsg: string | null | undefined;
  justSaved: boolean;
}) {
  const ro = !canManage;

  return (
    <form action={action} className={styles.fiscalForm}>
      {/* Entidade e país são fixos: a org (matriz) e o país do cadastro. */}
      <input type="hidden" name="target" value="org" />
      <input type="hidden" name="country" value={country} />

      <div className={styles.fiscalSection}>Identificação</div>
      <div className="field">
        <label>{country === "BR" ? "Razão social" : "Legal name"}</label>
        <input name="legalName" defaultValue={profile.legalName} disabled={ro} placeholder={country === "BR" ? "Ex.: Igreja Batista Central" : "Ex.: Central Baptist Church"} />
      </div>
      <div className="mrow">
        <div className="field">
          <label>{country === "BR" ? "Nome fantasia" : "Trade name (DBA)"}</label>
          <input name="tradeName" defaultValue={profile.tradeName} disabled={ro} />
        </div>
        <div className="field">
          <label>{country === "BR" ? "CNPJ" : "EIN"}</label>
          <input name="taxId" defaultValue={profile.taxId} disabled={ro} placeholder={country === "BR" ? "00.000.000/0000-00" : "00-0000000"} />
        </div>
      </div>
      {country === "BR" ? (
        <div className="field">
          <label>Inscrição estadual</label>
          <input name="stateRegistration" defaultValue={profile.stateRegistration} disabled={ro} placeholder="Isento, se não houver" />
        </div>
      ) : (
        <div className="field">
          <label>Tax-exempt status</label>
          <input name="taxExemptStatus" defaultValue={profile.taxExemptStatus} disabled={ro} placeholder="Ex.: 501(c)(3)" />
        </div>
      )}

      <div className={styles.fiscalSection}>Endereço fiscal</div>
      <div className="mrow">
        <div className="field" style={{ flex: 3 }}>
          <label>{country === "BR" ? "Logradouro" : "Street"}</label>
          <input name="addrStreet" defaultValue={profile.address.street} disabled={ro} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>{country === "BR" ? "Número" : "Number"}</label>
          <input name="addrNumber" defaultValue={profile.address.number} disabled={ro} />
        </div>
      </div>
      <div className="mrow">
        <div className="field">
          <label>{country === "BR" ? "Bairro" : "District"}</label>
          <input name="addrDistrict" defaultValue={profile.address.district} disabled={ro} />
        </div>
        <div className="field">
          <label>{country === "BR" ? "Cidade" : "City"}</label>
          <input name="addrCity" defaultValue={profile.address.city} disabled={ro} />
        </div>
      </div>
      <div className="mrow">
        <div className="field">
          <label>{country === "BR" ? "UF" : "State"}</label>
          <input name="addrState" defaultValue={profile.address.state} disabled={ro} />
        </div>
        <div className="field">
          <label>{country === "BR" ? "CEP" : "ZIP"}</label>
          <input name="addrZip" defaultValue={profile.address.zip} disabled={ro} />
        </div>
      </div>

      <div className={styles.fiscalSection}>Dados bancários</div>
      {country === "BR" ? (
        <>
          <div className="mrow">
            <div className="field">
              <label>Banco</label>
              <input name="bankName" defaultValue={profile.bank.bank} disabled={ro} />
            </div>
            <div className="field">
              <label>Agência</label>
              <input name="bankAgency" defaultValue={profile.bank.agency} disabled={ro} />
            </div>
          </div>
          <div className="mrow">
            <div className="field">
              <label>Conta</label>
              <input name="bankAccount" defaultValue={profile.bank.account} disabled={ro} />
            </div>
            <div className="field">
              <label>Tipo de conta</label>
              <input name="bankAccountType" defaultValue={profile.bank.accountType} disabled={ro} placeholder="Corrente / Poupança" />
            </div>
          </div>
          <div className="field">
            <label>Chave PIX</label>
            <input name="pixKey" defaultValue={profile.pixKey} disabled={ro} />
          </div>
        </>
      ) : (
        <>
          <div className="mrow">
            <div className="field">
              <label>Routing number</label>
              <input name="bankRouting" defaultValue={profile.bank.routing} disabled={ro} />
            </div>
            <div className="field">
              <label>Account number</label>
              <input name="bankAccount" defaultValue={profile.bank.account} disabled={ro} />
            </div>
          </div>
          <label className="field check">
            <input type="checkbox" name="donationReceipts" value="1" defaultChecked={profile.donationReceipts} disabled={ro} />
            <span>Emitir recibos de doação (donation receipts)</span>
          </label>
        </>
      )}

      {errorMsg ? <div className="gerr">{errorMsg}</div> : null}

      {canManage ? (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
          {justSaved && !pending ? <span className="muted">Salvo.</span> : null}
        </div>
      ) : null}
    </form>
  );
}
