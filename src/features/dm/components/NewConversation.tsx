"use client";

// Iniciar conversa (Client). Ação primária da lista: escolhe entre os membros da org que
// têm conta (menos eu) e abre a conversa — reaproveitando a existente se já houver (o par
// canônico é resolvido na Server Action). Ao abrir, navega para /dm/[threadId].
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { openOrCreateThread } from "../actions";
import type { DmCandidate } from "../types";
import styles from "../dm.module.css";

export function NewConversation({ candidates }: { candidates: DmCandidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setOtherId("");
    setErr(null);
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    const res = await openOrCreateThread(otherId);
    setSaving(false);
    if (res.success) {
      close();
      router.push(`/dm/${res.data.id}`);
    } else {
      setErr(res.message);
    }
  }

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        Nova conversa
      </button>

      {open ? (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>Nova conversa</h3>
            <p className="msub" style={{ marginTop: 0 }}>
              Uma conversa reservada entre você e outra pessoa da equipe.
            </p>

            {candidates.length === 0 ? (
              <div className="empty" style={{ lineHeight: 1.6 }}>
                Não há mais ninguém com conta na sua igreja.
                <br />
                <span className="muted">Convide alguém em Configurações para conversar por aqui.</span>
              </div>
            ) : (
              <div className={styles.picker}>
                <div className="field">
                  <label>Com quem</label>
                  <Select value={otherId} onChange={(e) => setOtherId(e.target.value)} autoFocus>
                    <option value="">Escolha uma pessoa…</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {err ? <div className="gerr">{err}</div> : null}
              </div>
            )}

            <div className="actions">
              <button className="btn ghost" type="button" onClick={close}>
                Cancelar
              </button>
              {candidates.length > 0 ? (
                <button className="btn" type="button" onClick={submit} disabled={saving || !otherId}>
                  {saving ? "Abrindo…" : "Abrir conversa"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
