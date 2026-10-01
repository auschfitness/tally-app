"use client";

// Aba "Sermão": abre direto no sermão em andamento mexido por último ("Continuando"), com
// troca pelo cabeçalho; sem nenhum em andamento, mostra a escolha (novo ou da lista). O
// editor é o mesmo de /study/sermon, com autosave; `slot` só muda quando o pastor escolhe
// outro sermão, para o editor não remontar no meio da escrita. `saved` (id → último
// retrato gravado, vindo da área de trabalho) vence o que o servidor mandou ao carregar a
// página: reabrir um sermão nunca parte de texto velho, e o sermão novo criado aqui entra
// na lista.
import { useState } from "react";
import { STATUS_LBL } from "../../domain";
import type { Sermon, SermonStatus } from "../../types";
import { SermonEditor } from "../SermonEditor";
import type { EditorData, Incoming } from "./ReaderWorkspace";
import styles from "./reader.module.css";

const OPEN = new Set<SermonStatus>(["draft", "preparing", "ready"]);
const editedAt = (iso: string): string => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

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
  const latest = (s: Sermon): Sermon => saved[s.id] ?? s;
  const known = new Set(editor.sermons.map((s) => s.id));
  const all = [...Object.values(saved).filter((s) => !known.has(s.id)), ...editor.sermons.map(latest)];
  const inProgress = all.filter((s) => OPEN.has(s.status)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const [pick, setPick] = useState<{ id: string | null; slot: number } | null>(() => (inProgress[0] ? { id: inProgress[0].id, slot: Date.now() } : null));
  const [choosing, setChoosing] = useState(false);

  if (!pick || choosing) {
    return (
      <div data-testid="sermon-picker">
        <button type="button" className="btn" onClick={() => { setChoosing(false); setPick({ id: null, slot: Date.now() }); }}>Novo sermão</button>
        <p className={styles.senseTag} style={{ margin: "20px 0 8px" }}>Em andamento</p>
        {inProgress.length === 0 ? <p className={styles.muted}>Nenhum sermão em andamento.</p> : (
          <ul className={styles.sermonList}>
            {inProgress.map((s) => (
              <li key={s.id}>
                <button type="button" aria-current={pick?.id === s.id ? "true" : undefined} onClick={() => { setChoosing(false); if (pick?.id !== s.id) setPick({ id: s.id, slot: Date.now() }); }}>
                  <b>{s.title || "Sem título"}</b>
                  <span>{STATUS_LBL[s.status]} · editado {editedAt(s.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pick ? <button type="button" className="link" style={{ marginTop: 12 }} onClick={() => setChoosing(false)}>Voltar ao sermão</button> : null}
      </div>
    );
  }

  const sermon = pick.id ? all.find((s) => s.id === pick.id) ?? null : null;
  return (
    <div data-testid="sermon-tab">
      {/* Trocar desmonta o editor, que grava na hora o que estava pendente. */}
      <button type="button" className={styles.continuing} onClick={() => setChoosing(true)} aria-label="Trocar sermão">
        <span className={styles.senseTag}>{sermon ? "Continuando" : "Novo sermão"}</span>
        <b>{sermon ? sermon.title || "Sem título" : "Sem título"}</b>
        {sermon ? <span className={styles.muted}>{STATUS_LBL[sermon.status]}</span> : null}
        <span className={styles.continuingChev} aria-hidden>⌄</span>
      </button>
      <SermonEditor
        key={pick.slot}
        embedded
        incoming={incoming}
        onIncomingDone={onIncomingDone}
        onSaved={(s) => {
          onSaved(s);
          // Sermão novo ganhou id ao salvar: o cabeçalho passa a mostrar o título dele.
          setPick((p) => (p && !p.id ? { ...p, id: s.id } : p));
        }}
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
