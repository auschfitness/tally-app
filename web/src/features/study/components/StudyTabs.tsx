"use client";

// Sub-nav do Estudo (Biblioteca | Notas). Recursos e Buscar do legado ficam para
// depois (Recursos precisa de handoff de tabela própria; Buscar é derivado).
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../study.module.css";

const TABS: [string, string][] = [
  ["/study", "Biblioteca"],
  ["/study/notes", "Notas"],
];

export function StudyTabs() {
  const path = usePathname();
  return (
    <div className={styles.chips} style={{ marginBottom: 16 }}>
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={`${styles.fchip}${path === href ? " " + styles.on : ""}`}>{label}</Link>
      ))}
    </div>
  );
}
