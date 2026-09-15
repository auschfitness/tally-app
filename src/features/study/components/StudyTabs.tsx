"use client";

// Sub-nav do Estudo. Duas variantes: a de hoje (Biblioteca | Notas) e a da spec 06,
// atrás da flag `study.library_v2`.
//
// ⚠️ TETO DURO: 3 itens na sub-nav, e nada além disso.
// A meta de "no máximo 3 controles" da spec é sobre a barra de AÇÃO — navegação é
// orientação, não controle. Mas a sub-nav é exatamente por onde os onze controles
// voltam a nascer, um item de cada vez. Se um dia parecer que falta um quarto item
// aqui, isso é sinal de repensar a navegação do módulo, NÃO de crescer esta lista.
// O que não é rotina semanal vai para o "···" (hoje: o Mapa de Escrituras, que a
// spec classifica como exploração e manda para o menu do módulo).
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../study.module.css";

const TABS: [string, string][] = [
  ["/study", "Biblioteca"],
  ["/study/notes", "Notas"],
];

// Rotina semanal do pastor. Máximo 3 — ver o aviso acima.
const TABS_V2: [string, string][] = [
  ["/study", "Sermões"],
  ["/study/series", "Séries"],
  ["/study/notes", "Notas"],
];

// Exploração: alcançável sempre, visível só quando procurada.
const OVERFLOW: [string, string][] = [["/study/map", "Mapa de Escrituras"]];

export function StudyTabs({ v2 = false }: { v2?: boolean }) {
  const path = usePathname();
  const tabs = v2 ? TABS_V2 : TABS;
  return (
    <div className={styles.subnav}>
      <div className={styles.chips}>
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className={`${styles.fchip}${path === href ? " " + styles.on : ""}`}>{label}</Link>
        ))}
      </div>
      {v2 ? (
        <details
          className={styles.more}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.removeAttribute("open");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.removeAttribute("open");
          }}
        >
          <summary
            className={`${styles.moreBtn}${OVERFLOW.some(([h]) => h === path) ? " " + styles.on : ""}`}
            aria-label="Mais do Estudo"
          >
            ···
          </summary>
          <div className={styles.moreMenu}>
            {OVERFLOW.map(([href, label]) => (
              <Link key={href} href={href} className={styles.moreItem}>{label}</Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
