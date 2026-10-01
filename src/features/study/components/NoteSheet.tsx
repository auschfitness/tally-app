"use client";

// Folha "Nova nota" / edição de nota solta (spec 10 §5). Um campo grande e a passagem
// opcional: com passagem válida a nota vai para study_text_notes (aparece também no
// texto da Bíblia); sem, para study_notes. Entra com fade + escala (celular: sobe de
// baixo); Esc e clique fora fecham. A saída espera a transição antes de desmontar.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseRefs } from "@/lib/bible/parse";
import { usfmToOsis } from "@/lib/bible/osis";
import { deleteNoteAction, saveLooseNoteAction, saveTextNoteAction } from "../actions";
import type { NoteItem } from "../domain";
import styles from "../study.module.css";

const EXIT_MS = 100;

export function NoteSheet({ note, onClose }: { note: NoteItem | null; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState(note?.text ?? "");
  const [passage, setPassage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  function close() {
    setShown(false);
    window.setTimeout(onClose, EXIT_MS);
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    area.current?.focus();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (busy) return;
    if (!text.trim()) return setErr("Escreva algo para guardar.");
    const ref = !note && passage.trim() ? parseRefs(passage)[0] : null;
    if (!note && passage.trim() && !ref) return setErr("Não reconheci a passagem. Tente assim: João 3:16.");
    const osis = ref ? usfmToOsis(ref.book) : null;
    setBusy(true);
    setErr("");
    const r =
      ref && osis
        ? await saveTextNoteAction({ book: osis, chapter: ref.chapter, verse_start: ref.verse_start, verse_end: ref.verse_end, body: text })
        : await saveLooseNoteAction({ id: note?.id, text });
    setBusy(false);
    if (!r.success) return setErr(r.message || "Não consegui guardar a nota.");
    router.refresh();
    close();
  }

  async function remove() {
    if (!note || busy) return;
    setBusy(true);
    const f = new FormData();
    f.set("id", note.id);
    await deleteNoteAction(f);
    router.refresh();
    close();
  }

  return (
    <div className={`${styles.sheetScrim}${shown ? " " + styles.sheetShown : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={note ? "Editar nota" : "Nova nota"}>
        <h2>{note ? "Editar nota" : "Nova nota"}</h2>
        <textarea
          ref={area}
          className={styles.sheetArea}
          placeholder="Escreva sua nota…"
          aria-label="Escreva sua nota"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {note ? null : (
          <>
            <input
              className={styles.sheetPassage}
              placeholder="Passagem (opcional), ex.: João 3:16"
              aria-label="Passagem (opcional)"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
            />
            <p className={styles.sheetHelp}>Com passagem, a nota aparece também no texto da Bíblia.</p>
          </>
        )}
        {err ? <p className={styles.sheetErr} role="alert">{err}</p> : null}
        <div className={styles.sheetActs}>
          {note ? <button type="button" className={`${styles.secondary} ${styles.sheetDel}`} onClick={remove} disabled={busy}>Excluir</button> : null}
          <button type="button" className={styles.secondary} onClick={close}>Cancelar</button>
          <button type="button" className={styles.primary} onClick={save} disabled={busy}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
