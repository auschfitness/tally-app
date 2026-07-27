"use client";

// Administração da igreja (Client — dono das abas). Um só hub consolidando o que estava
// espalhado: Geral (org), Cargos e permissões (feature roles), Jurídico/Fiscal e Membros e
// convites (feature invites) — mais a Conta pessoal. As abas VISÍVEIS já vêm decididas por
// permissão no servidor (visibleAdminTabs); aqui só renderizamos o que o usuário pode ver.
// A aba inicial (initialTab) respeita ?tab= e cai na primeira visível — quem só tem uma
// permissão entra direto na aba que pode. Cada form é uma Server Action isolada (reuso; sem
// reescrever lógica). Strings vêm do dicionário i18n (resolvido no SSR pela page).
import { useState } from "react";
import { InstitutionPanel } from "./InstitutionPanel";
import { AccountPanel } from "./AccountPanel";
import { FiscalPanel } from "./FiscalPanel";
import { TeamPanel } from "@/features/roles/components/TeamPanel";
import { InvitesManager } from "@/features/invites/components/InvitesManager";
import type { SettingsData } from "../types";
import type { AdminTabKey } from "../domain";
import type { InviteView } from "@/features/invites/types";
import type { Dictionary } from "@/lib/i18n";

export function SettingsView({
  data,
  dict,
  visibleTabs,
  initialTab,
  invites,
}: {
  data: SettingsData;
  dict: Dictionary;
  visibleTabs: AdminTabKey[];
  initialTab: AdminTabKey;
  invites: InviteView[];
}) {
  const [tab, setTab] = useState<AdminTabKey>(initialTab);
  const t = dict.settings;

  const label: Record<AdminTabKey, string> = {
    geral: t.tabInstitution,
    cargos: t.tabTeam,
    juridico: t.tabLegal,
    membros: t.tabMembers,
    conta: t.tabAccount,
  };

  // Troca de aba + sincroniza o ?tab= (link compartilhável, sem round-trip no servidor).
  function selectTab(key: AdminTabKey) {
    setTab(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      /* history indisponível — só o estado local basta */
    }
  }

  return (
    <>
      <h1 className="page">{t.title}</h1>
      <p className="sub">{t.subtitle}</p>
      <div className="tabs">
        {visibleTabs.map((key) => (
          <button key={key} className={`tab${tab === key ? " on" : ""}`} onClick={() => selectTab(key)}>
            {label[key]}
          </button>
        ))}
      </div>
      {tab === "geral" ? (
        <InstitutionPanel orgName={data.orgName} currency={data.currency} />
      ) : tab === "cargos" ? (
        <TeamPanel data={data.team} />
      ) : tab === "juridico" ? (
        <FiscalPanel fiscal={data.fiscal} canManage={data.canManageFiscal} />
      ) : tab === "membros" ? (
        <InvitesManager invites={invites} />
      ) : (
        <AccountPanel userName={data.userName} account={data.account} locale={data.locale} isOwner={data.isOwner} dict={dict} />
      )}
    </>
  );
}
