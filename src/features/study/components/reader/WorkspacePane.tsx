"use client";

// Área de trabalho (spec 07): abas à direita no desktop, gaveta no celular. Todas as
// abas abertas ficam MONTADAS (só a ativa aparece) para não perder estado — o editor de
// sermão não pode desmontar no meio de um autosave.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { chapterLabel, releaseVelocity, rubberband, sheetAfterDrag, tabKey, type SheetState, type Workspace, type WsTab, type LexShort } from "../../reader";
import styles from "./reader.module.css";

function tabLabel(t: WsTab, lex: Record<string, LexShort>): string {
  if (t.kind === "word") return lex[t.strong]?.lemma ?? t.strong;
  if (t.kind === "verse") return `${chapterLabel(t)}:${t.verse}`;
  if (t.kind === "commentary") return "Comentário";
  return t.kind === "notes" ? "Notas" : "Sermão";
}

export type PaneView = "split" | "full" | "rail";

// Ícones de 16px, traço do tema (currentColor); o texto da aba continua sendo o nome.
const ICON: Record<string, string> = {
  word: "M3 13l3.5-9L10 13M4.4 10h4.2M12 6h2M12 9h2M12 12h2",
  verse: "M8 3.5C6.5 2.5 4.5 2.5 2 3v9c2.5-.5 4.5-.5 6 .5 1.5-1 3.5-1 6-.5V3c-2.5-.5-4.5-.5-6 .5zM8 3.5v9",
  notes: "M3 13l.7-3L10.5 3.2a1.4 1.4 0 0 1 2 0l.3.3a1.4 1.4 0 0 1 0 2L6 12.3zM9.5 4.2l2.3 2.3",
  sermon: "M4 2.5h6l2.5 2.5v8.5H4zM10 2.5V5h2.5M6 8h4.5M6 10.5h4.5",
  commentary: "M2.5 3.5h11v7h-5l-3 2v-2h-3z",
  expand: "M9.5 2.5h4v4M13.5 2.5L9 7M6.5 13.5h-4v-4M2.5 13.5L7 9",
  shrink: "M13.5 2.5L9.5 6.5M9.5 3v3.5H13M2.5 13.5l4-4M6.5 13V9.5H3",
  fold: "M2.5 3.5h11v9h-11zM10 3.5v9", // painel lateral (como o do menu esquerdo, espelhado)
  unfold: "M2.5 3.5h11v9h-11zM10 3.5v9",
  plus: "M8 3.5v9M3.5 8h9",
};
export function Icon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg className={styles.ico} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON[name]} />
    </svg>
  );
}

type Drag = { id: number; y0: number; dy: number; samples: { y: number; t: number }[] };

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
  view,
  onView,
}: {
  ws: Workspace;
  lex: Record<string, LexShort>;
  closing: boolean;
  onActivate: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseAll: () => void;
  renderTab: (t: WsTab) => ReactNode;
  addable: { kind: "notes" | "sermon" | "commentary"; label: string }[];
  onAdd: (kind: "notes" | "sermon" | "commentary") => void;
  view: PaneView;
  onView: (v: PaneView) => void;
}) {
  const [sheet, setSheet] = useState<SheetState>("half");
  const [addOpen, setAddOpen] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const addRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);

  // Menu ＋: fecha com Esc (foco volta ao ＋) e com clique fora.
  useEffect(() => {
    if (!addOpen) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key !== "Escape") return;
      setAddOpen(false);
      addRef.current?.querySelector("button")?.focus();
    }
    function onDown(e: PointerEvent): void {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [addOpen]);

  // Reaberta durante a saída (fechou arrastando e abriu outra aba): tira o translate
  // que a deixou fora da tela.
  useEffect(() => {
    const el = paneRef.current;
    if (closing || !el) return;
    el.style.transition = "";
    el.style.transform = "";
  }, [closing]);

  function onDown(e: ReactPointerEvent<HTMLButtonElement>): void {
    const el = paneRef.current;
    if (drag.current || !el) return; // um dedo só
    el.style.transition = "none";
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, samples: [{ y: e.clientY, t: performance.now() }] };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: ReactPointerEvent<HTMLButtonElement>): void {
    const d = drag.current;
    const el = paneRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    d.dy = e.clientY - d.y0;
    const now = performance.now();
    d.samples.push({ y: e.clientY, t: now });
    while (d.samples.length > 2 && now - (d.samples[0]?.t ?? now) > 120) d.samples.shift();
    const shown = d.dy < 0 ? rubberband(d.dy, window.innerHeight) : d.dy;
    el.style.transform = `translateY(${shown}px)`;
  }
  // Soltar: anima a partir de onde o dedo deixou (sem salto) até o destino e só então
  // limpa o estilo inline. Fechar desce até 100% e aí desmonta.
  function onUp(e: ReactPointerEvent<HTMLButtonElement>): void {
    const d = drag.current;
    const el = paneRef.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!el) return;
    d.samples.push({ y: e.clientY, t: performance.now() }); // parar antes de soltar zera o peteleco
    const nextState = sheetAfterDrag(sheet, d.dy, releaseVelocity(d.samples));
    if (d.dy === 0) {
      el.style.transition = "";
      el.style.transform = "";
      return;
    }
    el.style.transition = "transform var(--dur-panel) var(--ease), height var(--dur-panel) var(--ease)";
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      if (nextState === "closed") {
        onCloseAll();
        return;
      }
      el.style.transition = "";
      el.style.transform = "";
    };
    el.addEventListener("transitionend", (ev) => { if (ev.propertyName === "transform") finish(); }, { once: true });
    window.setTimeout(finish, 450); // se o transitionend não vier
    el.style.transform = nextState === "closed" ? "translateY(100%)" : "translateY(0)";
    if (nextState !== "closed") setSheet(nextState);
  }

  return (
    <aside ref={paneRef} className={`${styles.pane} ${sheet === "full" ? styles.full : ""} ${closing ? styles.paneOut : ""} ${view === "rail" ? styles.railed : ""}`} aria-label="Área de trabalho" data-testid="workspace">
      <button type="button" className={styles.railBtn} aria-label="Abrir área de trabalho" onClick={() => onView("split")}><Icon name="unfold" /></button>
      <button
        type="button"
        className={styles.grab}
        aria-label={sheet === "full" ? "Baixar gaveta" : "Subir gaveta"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => { if (e.detail === 0) setSheet((s) => (s === "full" ? "half" : "full")); }} // Enter/Espaço
      />
      {/* Só as abas rolam para o lado; "Nova aba" e as ferramentas ficam fixas. O menu
          mora fora da área que rola: dentro dela era cortado e o + parecia não fazer nada. */}
      <div className={styles.tabBar}>
      <div className={styles.tabs} role="tablist">
        {ws.tabs.map((t) => {
          const key = tabKey(t);
          const label = tabLabel(t, lex);
          return (
            <span key={key} className={`${styles.tab} ${ws.active === key ? styles.tabOn : ""}`}>
              <button type="button" role="tab" id={`ws-tab-${key}`} aria-controls={`ws-panel-${key}`} aria-selected={ws.active === key} className={`link ${styles.tabBtn}`} onClick={() => onActivate(key)}><Icon name={t.kind} />{label}</button>
              <button type="button" className={`link ${styles.tabX}`} aria-label={`Fechar ${label}`} onClick={() => onCloseTab(key)}>×</button>
            </span>
          );
        })}
      </div>
      <span className={styles.tabActions}>
        {addable.length ? (
          <span ref={addRef} className={styles.addWrap}>
            <button type="button" className={styles.tabAdd} aria-label="Nova aba" aria-haspopup="menu" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}><Icon name="plus" /><span className={styles.tabAddLabel}>Nova aba</span></button>
            {addOpen ? (
              <div className={styles.addMenu} role="menu">
                {addable.map((a) => (
                  <button key={a.kind} type="button" role="menuitem" onClick={() => { setAddOpen(false); onAdd(a.kind); }}><Icon name={a.kind} />{a.label}</button>
                ))}
              </div>
            ) : null}
          </span>
        ) : null}
        <span className={styles.paneTools}>
          <button type="button" className={styles.tool} aria-label={view === "full" ? "Sair da tela cheia" : "Tela cheia"} onClick={() => onView(view === "full" ? "split" : "full")}><Icon name={view === "full" ? "shrink" : "expand"} /></button>
          <button type="button" className={styles.tool} aria-label="Recolher área de trabalho" onClick={() => onView("rail")}><Icon name="fold" /></button>
        </span>
      </span>
      </div>
      {ws.tabs.map((t) => {
        const key = tabKey(t);
        return (
          <div key={key} id={`ws-panel-${key}`} className={styles.body} role="tabpanel" aria-labelledby={`ws-tab-${key}`} hidden={ws.active !== key}>
            {renderTab(t)}
          </div>
        );
      })}
    </aside>
  );
}
