"use client";

// "Foco de Oração": nuvem semântica com layout em espiral (colisão evitada),
// portada de layoutPrayerCloud() do app legado. Mede o DOM, então é client-only;
// re-layouta no mount e no resize. Palavra clicada filtra o mural.
import { useLayoutEffect, useRef } from "react";
import type { CloudWord, CloudFilter } from "../domain";
import styles from "../prayer.module.css";

function catClass(cat: CloudWord["cat"]): string {
  const c = cat === "topic" ? styles.cwTopic : cat === "name" ? styles.cwName : styles.cwGroup;
  return c ?? "";
}

export function PrayerCloud({
  words,
  filter,
  onSelect,
}: {
  words: CloudWord[];
  filter: CloudFilter | null;
  onSelect: (f: CloudFilter | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const max = words.length ? words[0]!.count : 1;

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    function layout() {
      const el = boxRef.current;
      if (!el) return;
      const W = el.clientWidth, H = el.clientHeight, cx = W / 2, cy = H / 2;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-cw]"));
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      for (const node of nodes) {
        const vert = node.dataset.vert === "1";
        const w = node.offsetWidth, h = node.offsetHeight;
        const bw = vert ? h : w, bh = vert ? w : h, pad = 7;
        let done = false;
        for (let r = 0; r < 900 && !done; r++) {
          const ang = r * 0.55, rad = r * 1.15;
          const px = cx + rad * Math.cos(ang) - bw / 2;
          const py = cy + rad * Math.sin(ang) * 0.6 - bh / 2;
          if (px < 2 || py < 2 || px + bw > W - 2 || py + bh > H - 2) continue;
          const b2 = { x: px - pad, y: py - pad, w: bw + 2 * pad, h: bh + 2 * pad };
          const hit = placed.some((b) => !(b2.x + b2.w < b.x || b2.x > b.x + b.w || b2.y + b2.h < b.y || b2.y > b.y + b.h));
          if (!hit) {
            placed.push(b2);
            if (vert) {
              node.style.left = px + bw / 2 - w / 2 + "px";
              node.style.top = py + bh / 2 - h / 2 + "px";
            } else {
              node.style.left = px + "px";
              node.style.top = py + "px";
            }
            node.style.visibility = "visible";
            done = true;
          }
        }
        if (!done) node.style.visibility = "hidden";
      }
    }

    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [words]);

  if (!words.length) {
    return <div className="empty">Nada pendente no momento. Tudo foi respondido.</div>;
  }

  return (
    <div className={styles.cloudbox} ref={boxRef}>
      {words.map((d, i) => {
        const sz = Math.round(15 + (d.count / max) * 30);
        const vert = i % 3 === 1 && sz < 33 ? "1" : "0";
        const on = filter && filter.cat === d.cat && filter.val === d.text;
        return (
          <button
            key={d.cat + "|" + d.text}
            data-cw
            className={`${styles.cw} ${catClass(d.cat)}${on ? " " + styles.cwOn : ""}`}
            data-vert={vert}
            style={{ fontSize: sz, visibility: "hidden" }}
            onClick={() => onSelect(on ? null : { cat: d.cat, val: d.text })}
          >
            {d.text}
          </button>
        );
      })}
    </div>
  );
}
