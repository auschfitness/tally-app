"use client";

// Barra de cima das páginas de impressão: voltar e imprimir (some ao imprimir).
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import styles from "../print.module.css";

export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className={styles.bar}>
      <Link href={backHref} className={styles.back}>
        <UiIcon icon={ChevronLeft} />
        Voltar à ficha
      </Link>
      <button type="button" className={styles.printBtn} onClick={() => window.print()}>
        <UiIcon icon={Printer} />
        Imprimir
      </button>
    </div>
  );
}
