"use client";

// Configurações (Client — dono das abas). Instituição (org + campi + multi) e Conta
// (perfil + preferências). Cada form é uma Server Action isolada.
import { useState } from "react";
import { InstitutionPanel } from "./InstitutionPanel";
import { AccountPanel } from "./AccountPanel";
import type { SettingsData } from "../types";

export function SettingsView({ data }: { data: SettingsData }) {
  const [tab, setTab] = useState<"inst" | "acc">("inst");
  return (
    <>
      <h1 className="page">Configurações</h1>
      <p className="sub">Ajustes da instituição e da sua conta</p>
      <div className="tabs">
        <button className={`tab${tab === "inst" ? " on" : ""}`} onClick={() => setTab("inst")}>Instituição</button>
        <button className={`tab${tab === "acc" ? " on" : ""}`} onClick={() => setTab("acc")}>Conta</button>
      </div>
      {tab === "inst" ? (
        <InstitutionPanel orgName={data.orgName} currency={data.currency} campuses={data.campuses} institution={data.institution} isOwner={data.isOwner} />
      ) : (
        <AccountPanel userName={data.userName} account={data.account} isOwner={data.isOwner} />
      )}
    </>
  );
}
