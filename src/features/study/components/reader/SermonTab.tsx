"use client";

// Aba "Sermão": escolher um sermão em andamento (ou começar um novo) e escrever ao lado
// do texto. O editor é o mesmo de /study/sermon, com autosave; `slot` só muda quando o
// pastor escolhe outro sermão, para o editor não remontar no meio da escrita.
import { useState } from "react";
import type { SectionKey } from "../../domain";
import type { SermonStatus } from "../../types";
import { SermonEditor } from "../SermonEditor";
import type { EditorData } from "./ReaderView";
import styles from "./reader.module.css";

type Incoming = { block: string; section: SectionKey; seq: number };
const OPEN = new Set<SermonStatus>(["draft", "preparing", "ready"]);

export function SermonTab({ editor, incoming }: { editor: EditorData; incoming: Incoming | null }) {
  const [pick, setPick] = useState<{ id: string | null; slot: number } | null>(null);
  // Bloco já entregue a um sermão não entra de novo quando o pastor troca de sermão.
  const [consumed, setConsumed] = useState(0);
  const inProgress = editor.sermons.filter((s) => OPEN.has(s.status));

  if (!pick) {
    return (
      <div data-testid="sermon-picker">
        <button type="button" className="btn" onClick={() => setPick({ id: null, slot: Date.now() })}>Novo sermão</button>
        <p className={styles.muted} style={{ margin: "16px 0 6px" }}>Em andamento</p>
        {inProgress.length === 0 ? <p className={styles.muted}>Nenhum sermão em andamento.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {inProgress.map((s) => (
              <li key={s.id}>
                <button type="button" className="link" onClick={() => setPick({ id: s.id, slot: Date.now() })}>{s.title || "Sem título"}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const sermon = pick.id ? editor.sermons.find((s) => s.id === pick.id) ?? null : null;
  return (
    <div data-testid="sermon-tab">
      <button type="button" className="link" onClick={() => { setConsumed(incoming?.seq ?? 0); setPick(null); }}>‹ Trocar sermão</button>
      <SermonEditor
        key={pick.slot}
        embedded
        incoming={incoming && incoming.seq > consumed ? incoming : null}
        sermon={sermon}
        series={editor.series}
        services={editor.services}
        campuses={editor.campuses}
        activeCampus={editor.activeCampus}
        locale={editor.locale}
      />
    </div>
  );
}
