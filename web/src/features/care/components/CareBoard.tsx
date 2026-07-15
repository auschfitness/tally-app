"use client";

// Painel de Care (Client — dono do botão "Novo Care" e do modal de criação).
// Faixa de resumo (aberto / resolvidos), depois os itens em aberto (ordenados por
// urgência). Os cards trazem seus próprios modais de contato/nota/edição.
import { useState } from "react";
import { careSummary, splitCare } from "../domain";
import type { CareItem, MemberOption, StickOption } from "../types";
import { CareCard } from "./CareCard";
import { CareItemModal } from "./CareItemModal";
import styles from "../care.module.css";

export function CareBoard({
  items,
  members,
  sticks,
  canManage,
}: {
  items: CareItem[];
  members: MemberOption[];
  sticks: StickOption[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summary = careSummary(items);
  const { open: openItems } = splitCare(items);

  return (
    <>
      <div className={styles.header} style={{ display: "flex", alignItems: "flex-start" }}>
        <div>
          <h1 className="page">Care</h1>
          <p className="sub" style={{ margin: 0 }}>Cuidado pastoral. Quem precisa de atenção, e o que estamos fazendo.</p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>+ Novo Care</button>
      </div>

      <div className="ministrip">
        <div><div className="mi-k">Care em aberto</div><div className="mi-v">{summary.open}</div></div>
        <div><div className="mi-k">Resolvidos</div><div className={`mi-v ${styles.pos}`}>{summary.resolved}</div></div>
      </div>

      <h3 className={styles.sectionTitle}>Care em aberto</h3>
      {openItems.length === 0 ? (
        <div className="empty">Nenhum care em aberto. Crie um novo quando alguém precisar de acompanhamento.</div>
      ) : (
        openItems.map((it) => <CareCard key={it.id} item={it} members={members} sticks={sticks} canManage={canManage} />)
      )}

      {open ? <CareItemModal members={members} sticks={sticks} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
