"use client";

// Aba "Sermão": escolher um sermão em andamento (ou começar um novo) e escrever ao lado
// do texto. O editor é o mesmo de /study/sermon, com autosave; `slot` só muda quando o
// pastor escolhe outro sermão, para o editor não remontar no meio da escrita. `saved`
// (id → último retrato gravado, vindo da área de trabalho) vence o que o servidor mandou
// ao carregar a página: reabrir um sermão nunca parte de texto velho, e o sermão novo
// criado aqui entra na lista.
import { useState } from "react";
import type { Sermon, SermonStatus } from "../../types";
import { SermonEditor } from "../SermonEditor";
import type { EditorData, Incoming } from "./ReaderWorkspace";
import styles from "./reader.module.css";

const OPEN = new Set<SermonStatus>(["draft", "preparing", "ready"]);

export function SermonTab({
  editor,
  incoming,
  saved,
  onSaved,
  onIncomingDone,
}: {
  editor: EditorData;
  incoming: Incoming | null;
  saved: Record<string, Sermon>;
  onSaved: (s: Sermon) => void;
  onIncomingDone: (seq: number) => void;
}) {
  const [pick, setPick] = useState<{ id: string | null; slot: number } | null>(null);
  const latest = (s: Sermon): Sermon => saved[s.id] ?? s;
  const known = new Set(editor.sermons.map((s) => s.id));
  const all = [...Object.values(saved).filter((s) => !known.has(s.id)), ...editor.sermons.map(latest)];
  const inProgress = all.filter((s) => OPEN.has(s.status));

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

  const sermon = pick.id ? all.find((s) => s.id === pick.id) ?? null : null;
  return (
    <div data-testid="sermon-tab">
      {/* Trocar desmonta o editor, que grava na hora o que estava pendente. */}
      <button type="button" className="link" onClick={() => setPick(null)}>‹ Trocar sermão</button>
      <SermonEditor
        key={pick.slot}
        embedded
        incoming={incoming}
        onIncomingDone={onIncomingDone}
        onSaved={onSaved}
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
