// <Select> — dropdown reutilizável estilizado ao tema (claro E escuro), com seta
// custom, foco e sem cara nativa do SO (docs/design-principles.md: "controles
// nativos sempre estilizados ao tema"). É um wrapper fino sobre o <select> nativo:
// repassa TODOS os props (name/value/defaultValue/onChange/required/disabled…), então
// serve tanto em forms de Server Action quanto em selects controlados no cliente.
// Sem hooks → usável em Server e Client Components. Estilo em Select.module.css.
import type { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

// `compact` (não o atributo nativo `size`, que é número) → variante de filtro/toolbar.
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

export function Select({ compact, className, children, ...rest }: SelectProps) {
  const cls = [styles.select, compact ? styles.compact : "", className].filter(Boolean).join(" ");
  return (
    <select className={cls} {...rest}>
      {children}
    </select>
  );
}
