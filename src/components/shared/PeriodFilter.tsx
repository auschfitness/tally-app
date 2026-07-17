"use client";

// <PeriodFilter> — seletor de período reutilizável (Onda 2, Fatia A), estilo Meta Ads,
// para qualquer tela de histórico/relatório. Um botão discreto abre um popover com os
// presets (Hoje, Ontem, 7d, 14d, Este mês, Mês anterior, 3m, 6m, 12m, Todo, Personalizado
// com calendário). Entrega à tela um {preset, from, to} já resolvido via onChange.
//
// Design (docs/design-principles.md): uma ação, revelação progressiva (avançado =
// "Personalizado" só abre o calendário quando escolhido), controles temáticos claro E
// escuro, movimento base com os tokens --dur-*/--ease e respeito a reduced-motion.
//
// Autogerido: dono o estado do preset e (opcionalmente) persiste por tela em
// localStorage (storageKey) sem virar config. A tela só guarda o {from,to} p/ filtrar.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DateField } from "./DateField";
import {
  PERIOD_PRESETS,
  periodButtonLabel,
  resolvePeriod,
  type PeriodPreset,
  type PeriodValue,
} from "@/lib/utils/period";
import styles from "./PeriodFilter.module.css";

export interface PeriodFilterProps {
  onChange: (value: PeriodValue) => void;
  defaultPreset?: PeriodPreset; // default inteligente por tela (ex.: "thisMonth")
  storageKey?: string; // persiste a escolha por tela (localStorage) — opcional
  align?: "left" | "right"; // lado que o popover ancora (default: left)
  className?: string;
}

interface Persisted {
  preset: PeriodPreset;
  from: string | null;
  to: string | null;
}

function readStored(key: string | undefined): Persisted | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`tally.period.${key}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Persisted>;
    if (!p.preset || !PERIOD_PRESETS.some((x) => x.key === p.preset)) return null;
    return { preset: p.preset, from: p.from ?? null, to: p.to ?? null };
  } catch {
    return null;
  }
}

export function PeriodFilter({
  onChange,
  defaultPreset = "thisMonth",
  storageKey,
  align = "left",
  className,
}: PeriodFilterProps) {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset);
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // onChange sempre atual sem re-disparar o efeito de emissão (evita loop quando o pai
  // passa uma função inline).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Hidrata do localStorage uma vez (evita mismatch de SSR: só no cliente, pós-mount).
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStored(storageKey);
    if (stored) {
      setPreset(stored.preset);
      setCustomFrom(stored.from);
      setCustomTo(stored.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emite o intervalo resolvido sempre que a escolha muda; persiste por tela.
  useEffect(() => {
    const value: PeriodValue = {
      preset,
      ...resolvePeriod(preset, new Date(), { from: customFrom, to: customTo }),
    };
    onChangeRef.current(value);
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `tally.period.${storageKey}`,
          JSON.stringify({ preset, from: customFrom, to: customTo }),
        );
      } catch {
        // storage indisponível (modo privado/quota) — ignora, filtro segue em memória
      }
    }
  }, [preset, customFrom, customTo, storageKey]);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choosePreset = useCallback((key: PeriodPreset) => {
    setPreset(key);
    if (key !== "custom") setOpen(false); // "Personalizado" mantém aberto p/ o calendário
  }, []);

  const label = periodButtonLabel({
    preset,
    ...resolvePeriod(preset, new Date(), { from: customFrom, to: customTo }),
  });

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className={styles.calIcon} viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 3v3M17 3v3M4 8.5h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
          />
        </svg>
        <span className={styles.triggerLabel}>{label}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Selecionar período"
          className={`${styles.panel} ${align === "right" ? styles.right : ""}`}
        >
          <div className={styles.list}>
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`${styles.opt} ${preset === p.key ? styles.optActive : ""}`}
                aria-pressed={preset === p.key}
                onClick={() => choosePreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className={styles.custom}>
              <label className={styles.field}>
                <span className={styles.fieldLbl}>De</span>
                <DateField
                  value={customFrom ?? ""}
                  onChange={(v) => setCustomFrom(v || null)}
                  aria-label="Data inicial"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLbl}>Até</span>
                <DateField
                  value={customTo ?? ""}
                  onChange={(v) => setCustomTo(v || null)}
                  aria-label="Data final"
                />
              </label>
              <button type="button" className={styles.apply} onClick={() => setOpen(false)}>
                Aplicar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
