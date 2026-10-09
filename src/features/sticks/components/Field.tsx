"use client";

// Campo da ficha com edição no lugar (spec 13): o valor é texto; clicar (se pode editar) vira
// input; salva ao sair do campo ou com Enter, Esc cancela. Selects salvam ao escolher. Quem
// grava é o pai (`onSave` devolve a mensagem de erro, ou null se salvou).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DateField } from "@/components/shared/DateField";
import { Select } from "@/components/shared/Select";
import { FIELD_META, type PersonField } from "../domain";
import styles from "../people.module.css";

export type SaveField = (field: PersonField, raw: string) => Promise<string | null>;

export function Field({
  field,
  value,
  canEdit,
  onSave,
  display,
  suggestions,
  extra,
  title = false,
  autoEdit = 0,
}: {
  field: PersonField;
  value: string;
  canEdit: boolean;
  onSave: SaveField;
  display?: ReactNode; // como o valor aparece quando não está editando
  suggestions?: readonly string[]; // atalhos de texto sob o input (ex.: cargos)
  extra?: ReactNode; // ao lado do valor (ex.: link do WhatsApp)
  title?: boolean; // o nome no topo da ficha
  autoEdit?: number; // sobe de valor = abrir em edição (ficha recém-criada)
}) {
  const meta = FIELD_META[field] as { label: string; kind: string; options?: readonly (readonly [string, string])[]; required?: boolean };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState("");
  const busy = useRef(false);
  const skip = useRef(false);
  const selectAll = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);

  function start(all = false) {
    if (!canEdit) return;
    setDraft(value);
    setErr("");
    skip.current = false;
    selectAll.current = all;
    setEditing(true);
  }
  useEffect(() => {
    if (autoEdit) start(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);
  useEffect(() => {
    if (!editing) return;
    const el = wrap.current?.querySelector<HTMLInputElement | HTMLSelectElement>("input:not([type=hidden]), select");
    el?.focus();
    if (selectAll.current && el instanceof HTMLInputElement) el.select();
  }, [editing]);

  async function commit(next: string) {
    if (busy.current || skip.current) return;
    if (meta.kind === "date" && next === "" && (wrap.current?.querySelector<HTMLInputElement>("input[type=text]")?.value ?? "").trim()) {
      setErr("Data inválida.");
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    busy.current = true;
    const e = await onSave(field, next);
    busy.current = false;
    if (e) setErr(e);
    else setEditing(false);
  }
  function cancel() {
    skip.current = true;
    setErr("");
    setEditing(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
    } else if (e.key === "Enter" && meta.kind !== "select") {
      e.preventDefault();
      void commit(draft);
    }
  }
  function onBlur(e: React.FocusEvent) {
    if (!wrap.current?.contains(e.relatedTarget as Node | null)) void commit(draft);
  }

  const shown = value ? display ?? value : null;

  if (!editing && !canEdit && !value) return null;

  const editor = (
    <div ref={wrap} className={styles.fEdit} onKeyDown={onKeyDown} onBlur={onBlur}>
      {meta.kind === "select" ? (
        <Select
          compact
          aria-label={meta.label}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            void commit(e.target.value);
          }}
        >
          {meta.required ? null : <option value="">Não informado</option>}
          {meta.options?.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      ) : meta.kind === "date" ? (
        <DateField value={draft} onChange={setDraft} aria-label={meta.label} />
      ) : (
        <input
          className={title ? styles.nameInput : styles.fInput}
          type={meta.kind === "tel" ? "tel" : meta.kind === "email" ? "email" : "text"}
          inputMode={meta.kind === "tel" ? "tel" : meta.kind === "cpf" ? "numeric" : undefined}
          autoComplete="off"
          aria-label={meta.label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      {suggestions?.length ? (
        <div className={styles.sugg}>
          {suggestions.map((s) => (
            <button key={s} type="button" className={styles.suggBtn} onPointerDown={(e) => e.preventDefault()} onClick={() => { setDraft(s); void commit(s); }}>{s}</button>
          ))}
        </div>
      ) : null}
      {err ? <p className={styles.fErr} role="alert">{err}</p> : null}
    </div>
  );

  if (title) {
    return editing ? (
      editor
    ) : canEdit ? (
      <h1 className={styles.name}>
        <button type="button" className={styles.nameBtn} onClick={() => start()} title="Editar nome">{value}</button>
      </h1>
    ) : (
      <h1 className={styles.name}>{value}</h1>
    );
  }

  return (
    <div className={styles.fRow}>
      <span className={styles.fLabel}>{meta.label}</span>
      {editing ? (
        editor
      ) : (
        <div className={styles.fVal}>
          {canEdit ? (
            <button type="button" className={styles.fBtn} onClick={() => start()} aria-label={`Editar ${meta.label.toLowerCase()}`}>
              {shown ?? <span className={styles.fHint}>Adicionar</span>}
            </button>
          ) : (
            <span>{shown}</span>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
