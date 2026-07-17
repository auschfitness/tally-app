"use client";

// Gestão de Campus (Client — Server Actions). Lista cada campus com renomear inline,
// desativar/reativar e remover; adiciona novos ao fim. Fonte: tabela `campuses`
// (RLS is_org_member). Desativar (campuses.active=false) retira o campus do seletor e
// dos filtros SEM apagar histórico — o caminho certo para uma filial que fechou.
// Remover é permanente e o banco recusa se o campus estiver em uso (FK).
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addCampusAction, renameCampusAction, removeCampusAction, setCampusActiveAction } from "../actions";
import type { CampusRow } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function CampusManager({ campuses }: { campuses: CampusRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  const [addState, addAction, addPending] = useActionState(addCampusAction, INITIAL);
  const [renameState, renameAction] = useActionState(renameCampusAction, INITIAL);
  const [activeState, activeAction] = useActionState(setCampusActiveAction, INITIAL);
  const [rmState, rmAction] = useActionState(removeCampusAction, INITIAL);
  const addRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState.success && addState !== INITIAL) {
      addRef.current?.reset();
      router.refresh();
    }
  }, [addState, router]);
  useEffect(() => {
    if (renameState.success && renameState !== INITIAL) {
      setEditing(null);
      router.refresh();
    }
  }, [renameState, router]);
  useEffect(() => {
    if (activeState.success && activeState !== INITIAL) router.refresh();
  }, [activeState, router]);
  useEffect(() => {
    if (rmState.success && rmState !== INITIAL) router.refresh();
  }, [rmState, router]);

  const errMsg =
    (!renameState.success && renameState.message) ||
    (!activeState.success && activeState.message) ||
    (!rmState.success && rmState.message) ||
    null;

  return (
    <div className={styles.ctrl}>
      <ul className={styles.campusList}>
        {campuses.length === 0 ? (
          <li className={styles.campusEmpty}>Nenhum campus ainda. Adicione o primeiro abaixo.</li>
        ) : (
          campuses.map((c) => (
            <li key={c.id} className={`${styles.campusRow}${c.active ? "" : " " + styles.campusOff}`}>
              {editing === c.id ? (
                <form action={renameAction} className={styles.campusEdit}>
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} autoFocus aria-label="Nome do campus" />
                  <button className="btn sm" type="submit">Salvar</button>
                  <button className="btn ghost sm" type="button" onClick={() => setEditing(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span className={styles.campusName}>
                    {c.name}
                    {c.active ? null : <span className={styles.campusBadge}>desativado</span>}
                  </span>
                  <div className={styles.campusActions}>
                    {c.active ? (
                      <>
                        <button className="link" type="button" onClick={() => setEditing(c.id)}>Renomear</button>
                        <form action={activeAction} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value="0" />
                          <button className="link" type="submit">Desativar</button>
                        </form>
                      </>
                    ) : (
                      <>
                        <form action={activeAction} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value="1" />
                          <button className="link" type="submit">Reativar</button>
                        </form>
                        <form action={rmAction} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="link" type="submit" aria-label={`Remover ${c.name}`}>Remover</button>
                        </form>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
      {errMsg ? <div className="gerr">{errMsg}</div> : null}

      <form action={addAction} ref={addRef} className={styles.addRow}>
        <input name="name" placeholder="Novo campus (ex.: Zona Sul)" />
        <button className="btn ghost sm" type="submit" disabled={addPending}>{addPending ? "…" : "+ Adicionar"}</button>
      </form>
      {!addState.success && addState.message ? <div className="gerr">{addState.message}</div> : null}
    </div>
  );
}
