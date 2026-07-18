"use client";

// Board da Comunicação (Client). Duas abas: Compor (mensagem + público + prévia +
// registro) e Histórico (o registro do que foi enviado). Toda mutação é Server
// Action gated por communication.send.
import { useState } from "react";
import { MessageComposer } from "./MessageComposer";
import { MessageLog } from "./MessageLog";
import type { AudienceOptions, MessageListItem, StickOption, Template } from "../types";
import styles from "../communication.module.css";

type Tab = "compose" | "log";

export function CommunicationBoard({
  options,
  manualSticks,
  templates,
  messages,
}: {
  options: AudienceOptions;
  manualSticks: StickOption[];
  templates: Template[];
  messages: MessageListItem[];
}) {
  const [tab, setTab] = useState<Tab>("compose");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">Comunicação</h1>
          <p className="sub" style={{ margin: 0 }}>
            Envie uma mensagem para um público da igreja e veja o registro do que foi enviado.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`fchip${tab === "compose" ? " on" : ""}`} onClick={() => setTab("compose")}>
          Compor
        </button>
        <button className={`fchip${tab === "log" ? " on" : ""}`} onClick={() => setTab("log")}>
          Histórico
        </button>
      </div>

      {tab === "compose" ? (
        <MessageComposer
          options={options}
          manualSticks={manualSticks}
          templates={templates}
          onQueued={() => setTab("log")}
        />
      ) : (
        <MessageLog messages={messages} />
      )}
    </>
  );
}
