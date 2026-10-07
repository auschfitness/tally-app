"use client";

// Modo púlpito: o sermão em tela cheia para pregar. Letra grande (4 tamanhos, guardados
// no aparelho), relógio do tempo pregado (toque pausa), tela acesa (Wake Lock) e os
// versículos citados abrem ali mesmo. "Imprimir" usa o próprio navegador (PDF incluso);
// ?imprimir=1 imprime ao abrir. Sem animação: é tela de uso sob pressão, nada pode mexer.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Minus, Pause, Play, Plus, Printer, RotateCcw } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { parseRefs, refKey, type ScriptureRef } from "@/lib/bible/parse";
import { formatElapsed, pulpitSections } from "../domain";
import { loadVerses, type VerseText } from "../verse-text";
import type { Sermon } from "../types";
import styles from "../pulpit.module.css";

const SIZES = 4;
const SIZE_KEY = "mercy-pulpit-size";

export function PulpitView({ sermon, autoPrint }: { sermon: Sermon; autoPrint: boolean }) {
  const sections = useMemo(() => pulpitSections(sermon.content as Record<string, unknown>), [sermon.content]);
  const mainRef = useMemo(() => parseRefs(sermon.main_passage)[0] ?? null, [sermon.main_passage]);
  const [size, setSize] = useState(1);
  const [verses, setVerses] = useState<Record<string, VerseText[]>>({});
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const clock = useClock();

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(SIZE_KEY));
      if (v >= 0 && v < SIZES) setSize(v);
    } catch {}
  }, []);
  const changeSize = useCallback((d: number) => {
    setSize((s) => {
      const n = Math.min(SIZES - 1, Math.max(0, s + d));
      try {
        localStorage.setItem(SIZE_KEY, String(n));
      } catch {}
      return n;
    });
  }, []);

  const fetchRef = useCallback(async (r: ScriptureRef) => {
    const k = refKey(r);
    const vs = await loadVerses(r.book, r.chapter, r.verse_start, r.verse_end);
    setVerses((m) => ({ ...m, [k]: vs }));
    return vs;
  }, []);

  // Passagem principal sempre aberta no topo.
  const mainReady = useRef(false);
  useEffect(() => {
    if (!mainRef) {
      mainReady.current = true;
      return;
    }
    void fetchRef(mainRef).then(() => {
      mainReady.current = true;
    });
  }, [mainRef, fetchRef]);

  // ?imprimir=1: espera o texto da passagem chegar (até 3s) e abre a impressão.
  useEffect(() => {
    if (!autoPrint) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      if (mainReady.current || Date.now() - t0 > 3000) {
        window.clearInterval(id);
        window.print();
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [autoPrint]);

  useWakeLock();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea")) return;
      if (e.key === "+" || e.key === "=") changeSize(1);
      else if (e.key === "-") changeSize(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeSize]);

  function toggleRef(r: ScriptureRef) {
    const k = refKey(r);
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
    if (!verses[k]) void fetchRef(r);
  }

  const mainVerses = mainRef ? verses[refKey(mainRef)] : undefined;

  return (
    <div className={styles.root} data-size={size}>
      <header className={styles.bar}>
        <Link href={`/study/sermon/${sermon.id}`} className={styles.barBtn}>
          <UiIcon icon={ChevronLeft} />
          Editar
        </Link>
        <span className={styles.spacer} />
        <div className={styles.clock} aria-live="off">
          <button type="button" className={styles.clockBtn} onClick={clock.toggle} aria-label={clock.running ? "Pausar relógio" : "Continuar relógio"}>
            <UiIcon icon={clock.running ? Pause : Play} />
            <span className={styles.time}>{formatElapsed(clock.ms)}</span>
          </button>
          <button type="button" className="iconbtn" onClick={clock.reset} aria-label="Zerar relógio" title="Zerar relógio">
            <UiIcon icon={RotateCcw} />
          </button>
        </div>
        <span className={styles.spacer} />
        <button type="button" className="iconbtn" onClick={() => changeSize(-1)} disabled={size === 0} aria-label="Diminuir letra">
          <UiIcon icon={Minus} />
        </button>
        <button type="button" className="iconbtn" onClick={() => changeSize(1)} disabled={size === SIZES - 1} aria-label="Aumentar letra">
          <UiIcon icon={Plus} />
        </button>
        <ThemeToggle />
        <button type="button" className="iconbtn" onClick={() => window.print()} aria-label="Imprimir" title="Imprimir">
          <UiIcon icon={Printer} />
        </button>
      </header>

      <main className={styles.page}>
        <h1 className={styles.title}>{sermon.title || "(sem título)"}</h1>
        {sermon.main_passage ? <p className={styles.passage}>{sermon.main_passage}</p> : null}
        {sermon.big_idea.trim() ? <p className={styles.idea}>{sermon.big_idea}</p> : null}

        {mainVerses?.length ? <Quote verses={mainVerses} /> : null}

        {sections.length === 0 ? (
          <p className={styles.empty}>
            Este sermão ainda não tem texto. <Link href={`/study/sermon/${sermon.id}`}>Voltar ao editor</Link>
          </p>
        ) : null}

        {sections.map((sec) => (
          <section key={sec.key} className={styles.section}>
            {sec.label ? <h2 className={styles.label}>{sec.label}</h2> : null}
            {sec.paragraphs.map((p, i) => {
              const refs = dedupe(parseRefs(p)).filter((r) => !mainRef || refKey(r) !== refKey(mainRef));
              return (
                <div key={i} className={styles.para}>
                  <p>{p}</p>
                  {refs.length ? (
                    <div className={styles.refs}>
                      {refs.map((r) => {
                        const k = refKey(r);
                        return (
                          <button key={k} type="button" className={styles.ref} aria-expanded={open.has(k)} onClick={() => toggleRef(r)}>
                            {r.reference}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {refs.map((r) => {
                    const k = refKey(r);
                    const vs = verses[k];
                    return open.has(k) && vs?.length ? <Quote key={k} verses={vs} label={r.reference} /> : null;
                  })}
                </div>
              );
            })}
          </section>
        ))}
      </main>
    </div>
  );
}

function Quote({ verses, label }: { verses: VerseText[]; label?: string }) {
  return (
    <blockquote className={styles.quote}>
      {label ? <span className={styles.quoteRef}>{label}</span> : null}
      {verses.map((v) => (
        <span key={v.n}>
          <sup className={styles.vn}>{v.n}</sup>
          {v.text}{" "}
        </span>
      ))}
    </blockquote>
  );
}

function dedupe(refs: ScriptureRef[]): ScriptureRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => (seen.has(refKey(r)) ? false : (seen.add(refKey(r)), true)));
}

// Relógio que começa ao abrir; tocar pausa e continua; zerar recomeça parado.
function useClock() {
  const [acc, setAcc] = useState(0);
  const [since, setSince] = useState<number | null>(() => Date.now());
  const [, tick] = useState(0);
  useEffect(() => {
    if (since === null) return;
    const id = window.setInterval(() => tick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  const ms = acc + (since === null ? 0 : Date.now() - since);
  return {
    ms,
    running: since !== null,
    toggle: () => {
      if (since === null) setSince(Date.now());
      else {
        setAcc((a) => a + Date.now() - since);
        setSince(null);
      }
    },
    reset: () => {
      setAcc(0);
      setSince(null);
    },
  };
}

// Mantém a tela acesa enquanto o púlpito está aberto. O navegador solta o pedido quando
// a aba some; pede de novo ao voltar. Sem suporte (Safari antigo), segue sem.
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let lock: Sentinel | null = null;
    let alive = true;
    const ask = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock!.request("screen").then(
        (l) => {
          if (alive) lock = l;
          else void l.release();
        },
        () => {},
      );
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", ask);
      void lock?.release();
    };
  }, []);
}
