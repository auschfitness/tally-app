"use client";

// "→ Adicionar ao sermão" com seletor de SEÇÃO de destino (Fase 4). Botão discreto que,
// ao ser tocado, revela os 5 destinos do canvas (Esboço · Notas · Ilustrações · Aplicação
// · Resposta de oração) — revelação progressiva. "Notas" é o padrão (destaque sutil). O
// bloco é montado só no momento da escolha (getBlock), para refletir o estado atual da
// lente. Reutilizado pelo hub "Estudo do Texto" e pelo Assistente de estudo do editor.
import { useState } from "react";
import { SECTIONS, DEFAULT_SECTION, type SectionKey } from "../domain";
import styles from "../study.module.css";

export function AddToSermon({
  getBlock,
  onAdd,
  label = "→ Adicionar ao sermão",
  disabled = false,
}: {
  getBlock: () => string;
  onAdd: (block: string, section: SectionKey) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className={styles.addLens} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  function pick(section: SectionKey) {
    const block = getBlock();
    if (block) onAdd(block, section);
    setOpen(false);
  }

  return (
    <span className={styles.addPick} role="group" aria-label="Escolher a seção do sermão">
      <span className={styles.addPickLabel}>Adicionar em</span>
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          type="button"
          className={`${styles.addPickBtn}${s.key === DEFAULT_SECTION ? " " + styles.on : ""}`}
          onClick={() => pick(s.key)}
        >
          {s.label}
        </button>
      ))}
      <button type="button" className="link" onClick={() => setOpen(false)}>cancelar</button>
    </span>
  );
}
