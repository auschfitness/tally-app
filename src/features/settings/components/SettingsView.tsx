"use client";

// Configurações (Client — dono das abas). Instituição (org + campi + multi) e Conta
// (perfil + preferências). Strings vêm do dicionário i18n (resolvido no SSR pela
// page a partir de profiles.locale). Cada form é uma Server Action isolada.
import { useState } from "react";
import { InstitutionPanel } from "./InstitutionPanel";
import { AccountPanel } from "./AccountPanel";
import type { SettingsData } from "../types";
import type { Dictionary } from "@/lib/i18n";

export function SettingsView({ data, dict }: { data: SettingsData; dict: Dictionary }) {
  const [tab, setTab] = useState<"inst" | "acc">("inst");
  const t = dict.settings;
  return (
    <>
      <h1 className="page">{t.title}</h1>
      <p className="sub">{t.subtitle}</p>
      <div className="tabs">
        <button className={`tab${tab === "inst" ? " on" : ""}`} onClick={() => setTab("inst")}>{t.tabInstitution}</button>
        <button className={`tab${tab === "acc" ? " on" : ""}`} onClick={() => setTab("acc")}>{t.tabAccount}</button>
      </div>
      {tab === "inst" ? (
        <InstitutionPanel orgName={data.orgName} currency={data.currency} campuses={data.campuses} institution={data.institution} isOwner={data.isOwner} />
      ) : (
        <AccountPanel userName={data.userName} account={data.account} locale={data.locale} isOwner={data.isOwner} dict={dict} />
      )}
    </>
  );
}
