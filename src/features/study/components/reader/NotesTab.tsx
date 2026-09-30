"use client";

// Aba "Notas": notas da passagem aberta (study_text_notes, as mesmas da lente Notas).
// "Anotar" no balão chega aqui com o versículo já escolhido. A tabela guarda o livro em
// OSIS (como a lente Notas do BibleCompare); a rota fala USFM.
import { useEffect, useState } from "react";
import { usfmToOsis } from "@/lib/bible/osis";
import { deleteTextNoteAction, listTextNotesAction, saveTextNoteAction } from "../../actions";
import type { TextNote } from "../../types";
import { chapterLabel, type ChapterRef } from "../../reader";
import styles from "./reader.module.css";

export function NotesTab({ refNow, verse }: { refNow: ChapterRef; verse: number | null }) {
  const osis = usfmToOsis(refNow.book) ?? "";
  const [items, setItems] = useState<TextNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    void listTextNotesAction(osis, refNow.chapter).then((r) => {
      if (!alive) return;
      if (r.success) setItems(r.data);
      else { setItems([]); setErr(r.message || "Não consegui carregar as notas."); }
    });
    return () => {
      alive = false;
    };
  }, [osis, refNow.chapter]);

  async function save(): Promise<void> {
    setBusy(true);
    setErr("");
    const r = await saveTextNoteAction({ book: osis, chapter: refNow.chapter, verse_start: verse, verse_end: null, body: draft });
    setBusy(false);
    if (!r.success) { setErr(r.message || "Não consegui guardar a nota."); return; }
    setItems((l) => [r.data, ...(l ?? [])]);
    setDraft("");
  }

  async function remove(id: string): Promise<void> {
    const r = await deleteTextNoteAction(id);
    if (r.success) setItems((l) => (l ?? []).filter((n) => n.id !== id));
    else setErr(r.message || "Não consegui excluir a nota.");
  }

  const where = verse ? `${chapterLabel(refNow)}:${verse}` : chapterLabel(refNow);
  return (
    <div data-testid="notes-tab">
      <label className={styles.muted} htmlFor="reader-note">Nova nota · {where}</label>
      <textarea id="reader-note" rows={3} style={{ width: "100%" }} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "6px 0 16px" }}>
        <button type="button" className="btn" disabled={busy || !draft.trim() || !osis} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        {err ? <span className={styles.muted}>{err}</span> : null}
      </div>
      {items == null ? <p className={styles.muted}>Carregando…</p> : items.length === 0 ? <p className={styles.muted}>Nenhuma nota neste capítulo ainda.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((n) => (
            <li key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div className={styles.muted}>{n.verse_start ? `${chapterLabel(refNow)}:${n.verse_start}` : chapterLabel(refNow)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
              <button type="button" className="link" onClick={() => remove(n.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
