"use client";

// Área de trabalho (spec 07): abas à direita no desktop, gaveta no celular. Todas as
// abas abertas ficam MONTADAS (só a ativa aparece) para não perder estado — o editor de
// sermão não pode desmontar no meio de um autosave.
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { rubberband, sheetAfterDrag, tabKey, type SheetState, type Workspace, type WsTab, type LexShort } from "../../reader";
import styles from "./reader.module.css";

function tabLabel(t: WsTab, lex: Record<string, LexShort>): string {
  if (t.kind === "word") return lex[t.strong]?.lemma ?? t.strong;
  if (t.kind === "verse") return `v. ${t.verse}`;
  return t.kind === "notes" ? "Notas" : "Sermão";
}

export function WorkspacePane({
  ws,
  lex,
  closing,
  onActivate,
  onCloseTab,
  onCloseAll,
  renderTab,
  addable,
  onAdd,
  verseLabel,
}: {
  ws: Workspace;
  lex: Record<string, LexShort>;
  closing: boolean;
  onActivate: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseAll: () => void;
  renderTab: (t: WsTab) => ReactNode;
  addable: { kind: "notes" | "sermon"; label: string }[];
  onAdd: (kind: "notes" | "sermon") => void;
  verseLabel: (verse: number) => string;
}) {
  const [sheet, setSheet] = useState<SheetState>("half");
  const [addOpen, setAddOpen] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  function onDown(e: ReactPointerEvent<HTMLButtonElement>): void {
    if (drag.current) return; // ignora o 2º dedo
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: ReactPointerEvent<HTMLButtonElement>): void {
    const d = drag.current;
    const el = paneRef.current;
    if (!d || !el) return;
    d.dy = e.clientY - d.y;
    const shown = d.dy < 0 && sheet === "full" ? rubberband(d.dy, window.innerHeight) : d.dy;
    el.style.transform = `translateY(${shown}px)`;
  }
  function onUp(): void {
    const d = drag.current;
    const el = paneRef.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transform = "";
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    const nextState = sheetAfterDrag(sheet, d.dy, velocity);
    if (nextState === "closed") onCloseAll();
    else setSheet(nextState);
  }

  return (
    <aside ref={paneRef} className={`${styles.pane} ${sheet === "full" ? styles.full : ""} ${closing ? styles.paneOut : ""}`} aria-label="Área de trabalho" data-testid="workspace">
      <button type="button" className={styles.grab} aria-label="Arrastar gaveta" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      <div className={styles.tabs} role="tablist">
        {ws.tabs.map((t) => {
          const key = tabKey(t);
          const label = t.kind === "verse" ? verseLabel(t.verse) : tabLabel(t, lex);
          return (
            <span key={key} className={`${styles.tab} ${ws.active === key ? styles.tabOn : ""}`}>
              <button type="button" role="tab" aria-selected={ws.active === key} className="link" onClick={() => onActivate(key)}>{label}</button>
              <button type="button" className={`link ${styles.tabX}`} aria-label={`Fechar ${label}`} onClick={() => onCloseTab(key)}>×</button>
            </span>
          );
        })}
        {addable.length ? (
          <span style={{ position: "relative" }}>
            <button type="button" className={`link ${styles.tabAdd}`} aria-label="Abrir aba" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}>＋</button>
            {addOpen ? (
              <div className={styles.addMenu}>
                {addable.map((a) => (
                  <button key={a.kind} type="button" onClick={() => { setAddOpen(false); onAdd(a.kind); }}>{a.label}</button>
                ))}
              </div>
            ) : null}
          </span>
        ) : null}
      </div>
      {ws.tabs.map((t) => (
        <div key={tabKey(t)} className={styles.body} role="tabpanel" hidden={ws.active !== tabKey(t)}>
          {renderTab(t)}
        </div>
      ))}
    </aside>
  );
}
