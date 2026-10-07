"use client";

// Menu "Aa" da leitura: tamanho da letra e fundo (Claro / Sépia / Escuro), como num leitor
// de livros. Popover nativo (fecha com Esc e clique fora sem JS). Tamanho e tom vão para
// cookie e para o <html> na hora; o layout raiz lê os cookies no servidor (sem piscar).
// O tema claro/escuro é o mesmo do app inteiro (setThemeAction).
import { useEffect, useState, type CSSProperties } from "react";
import { ALargeSmall } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { setThemeAction } from "@/app/(dashboard)/actions";
import styles from "./reader.module.css";

type Size = "s" | "m" | "l";
type Tone = "light" | "sepia" | "dark";

const SIZES: { v: Size; label: string }[] = [
  { v: "s", label: "Letra normal" },
  { v: "m", label: "Letra maior" },
  { v: "l", label: "Letra grande" },
];
const TONES: { v: Tone; label: string }[] = [
  { v: "light", label: "Claro" },
  { v: "sepia", label: "Sépia" },
  { v: "dark", label: "Escuro" },
];

const YEAR = 60 * 60 * 24 * 365;
function setPref(name: string, value: string | null) {
  document.cookie = value ? `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax` : `${name}=; path=/; max-age=0`;
}

// `interlinear`: no celular a chave sai da barra (não cabe) e aparece aqui; no computador
// esta linha fica escondida por CSS e a chave continua na barra.
export function ReadingMenu({ interlinear }: { interlinear?: { on: boolean; toggle: () => void } }) {
  const [size, setSize] = useState<Size>("s");
  const [tone, setTone] = useState<Tone>("light");

  useEffect(() => {
    const html = document.documentElement;
    const s = html.dataset.readSize;
    setSize(s === "m" || s === "l" ? s : "s");
    setTone(html.dataset.theme === "dark" ? "dark" : html.dataset.readTone === "sepia" ? "sepia" : "light");
  }, []);

  function pickSize(v: Size) {
    const html = document.documentElement;
    if (v === "s") delete html.dataset.readSize;
    else html.dataset.readSize = v;
    setPref("mercy-read-size", v === "s" ? null : v);
    setSize(v);
  }

  function pickTone(v: Tone) {
    const html = document.documentElement;
    const theme = v === "dark" ? "dark" : "light";
    if (html.dataset.theme !== theme) {
      html.dataset.theme = theme;
      void setThemeAction(theme);
    }
    if (v === "sepia") html.dataset.readTone = "sepia";
    else delete html.dataset.readTone;
    setPref("mercy-read-tone", v === "sepia" ? "sepia" : null);
    setTone(v);
  }

  return (
    <>
      <button type="button" className={`${styles.barBtn} ${styles.aaBtn}`} popoverTarget="reading-menu" aria-label="Ajustes de leitura" title="Ajustes de leitura">
        <UiIcon icon={ALargeSmall} />
      </button>
      <div id="reading-menu" popover="auto" className={styles.aaMenu} data-testid="reading-menu">
        {interlinear ? (
          <label className={styles.aaInter}>
            <span>Interlinear</span>
            <span className={styles.toggle}>
              <input type="checkbox" role="switch" checked={interlinear.on} onChange={interlinear.toggle} data-testid="interlinear-toggle-menu" />
              <span className={styles.sw} aria-hidden />
            </span>
          </label>
        ) : null}
        <div className={styles.aaLabel}>Tamanho</div>
        <div className={styles.aaRow} role="group" aria-label="Tamanho da letra">
          {SIZES.map((o, i) => (
            <button key={o.v} type="button" className={styles.aaOpt} aria-pressed={size === o.v} aria-label={o.label} onClick={() => pickSize(o.v)}>
              <span className={styles.aaGlyph} style={{ "--level": i } as CSSProperties}>A</span>
            </button>
          ))}
        </div>
        <div className={styles.aaLabel}>Fundo</div>
        <div className={styles.aaRow} role="group" aria-label="Fundo da leitura">
          {TONES.map((o) => (
            <button key={o.v} type="button" className={styles.aaOpt} aria-pressed={tone === o.v} onClick={() => pickTone(o.v)}>
              <span className={styles.aaSwatch} data-tone={o.v} aria-hidden>Aa</span>
              <span className={styles.aaName}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
