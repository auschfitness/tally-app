"use client";

// <DateField> — campo de data PT-BR estilizado ao tema (claro E escuro), que SEMPRE
// exibe dd/mm/aaaa, independentemente do idioma do navegador/SO (o <input type="date">
// nativo herda o formato do locale do SO — não dá pra forçar por HTML/CSS). Segue o
// mesmo espírito do <Select> temático (docs/design-principles.md: "controles nativos
// sempre estilizados ao tema").
//
// Como funciona: um campo de texto mascarado (dd/mm/aaaa) para digitar + um ícone de
// calendário sobre um <input type="date"> invisível que abre o seletor nativo. O valor
// trafega SEMPRE em ISO (aaaa-mm-dd): via <input hidden name> (forms de Server Action)
// ou via onChange(iso) (uso controlado). Repassa defaultValue/value em ISO.
import { useEffect, useId, useState } from "react";
import { brDate, brToIso, maskBrDate } from "@/lib/utils/date";
import styles from "./DateField.module.css";

export interface DateFieldProps {
  name?: string;           // submete o ISO num form (Server Action)
  value?: string;          // ISO — modo controlado
  defaultValue?: string;   // ISO — modo não-controlado
  onChange?: (iso: string) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function DateField({ name, value, defaultValue, onChange, id, disabled, ...aria }: DateFieldProps) {
  const controlled = value !== undefined;
  const [iso, setIso] = useState<string>(defaultValue ?? "");
  const curIso = controlled ? (value ?? "") : iso;
  const [text, setText] = useState<string>(brDate(curIso));
  const autoId = useId();
  const fieldId = id ?? autoId;

  // Re-sincroniza o texto quando o valor controlado muda de fora (ex.: carregou).
  useEffect(() => {
    if (controlled) setText(brDate(value ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextIso: string) {
    if (!controlled) setIso(nextIso);
    onChange?.(nextIso);
  }
  function onText(raw: string) {
    const masked = maskBrDate(raw);
    setText(masked);
    emit(brToIso(masked)); // "" enquanto incompleto/inválido
  }
  function onNative(nativeIso: string) {
    setText(brDate(nativeIso));
    emit(nativeIso);
  }

  return (
    <div className={styles.wrap}>
      <input
        id={fieldId}
        className={styles.text}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={text}
        disabled={disabled}
        aria-label={aria["aria-label"]}
        onChange={(e) => onText(e.target.value)}
      />
      <span className={styles.cal} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 3v3M17 3v3M4 8.5h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
          />
        </svg>
        <input
          className={styles.native}
          type="date"
          tabIndex={-1}
          aria-label="Abrir calendário"
          value={curIso}
          disabled={disabled}
          onChange={(e) => onNative(e.target.value)}
          onClick={(e) => {
            const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
            el.showPicker?.();
          }}
        />
      </span>
      {name ? <input type="hidden" name={name} value={curIso} /> : null}
    </div>
  );
}
