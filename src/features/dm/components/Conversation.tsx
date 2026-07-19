"use client";

// Conversa aberta (Client). Mensagens em ordem cronológica, agrupadas por dia; as minhas
// e as do outro visualmente distintas (balão azul à direita × cinza à esquerda). Caixa de
// envio embaixo. Ao montar, marca como lidas as recebidas sem read_at (markThreadRead).
// Excluir só a própria mensagem, com confirmação inline (sem window.confirm).
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteMessage, markThreadRead, sendMessage } from "../actions";
import { dayLabel, groupByDay, hasReceivedUnread, isMine } from "../domain";
import type { DmMessage } from "../types";
import styles from "../dm.module.css";

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function Conversation({
  threadId,
  otherName,
  messages,
  myId,
  todayIso,
}: {
  threadId: string;
  otherName: string;
  messages: DmMessage[];
  myId: string;
  todayIso: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  // Ao abrir (e a cada nova leva de mensagens), marca as recebidas como lidas. O guard
  // pura evita a chamada quando não há nada a marcar. Roda uma vez por conjunto.
  useEffect(() => {
    if (hasReceivedUnread(messages, myId)) {
      void markThreadRead(threadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, messages.length]);

  // Rola para a última mensagem ao abrir e ao chegar/enviar.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setErr(null);
    const res = await sendMessage(threadId, { body: text });
    setSending(false);
    if (res.success) {
      setBody("");
      router.refresh();
    } else {
      setErr(res.message);
    }
  }

  async function remove(id: string) {
    setConfirmDel("");
    const res = await deleteMessage(id, threadId);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra linha (convenção de chat).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const days = groupByDay(messages);

  return (
    <>
      <div className="panel">
        {messages.length === 0 ? (
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Nenhuma mensagem ainda.
            <br />
            <span className="muted">Escreva a primeira mensagem para {otherName}.</span>
          </div>
        ) : (
          <div className={styles.thread}>
            {days.map((g) => (
              <div key={g.day} style={{ display: "contents" }}>
                <div className={styles.daySep}>{dayLabel(g.day, todayIso)}</div>
                {g.messages.map((m) => {
                  const mine = isMine(m.senderId, myId);
                  return (
                    <div key={m.id} className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                      <div className={styles.bubble}>{m.body}</div>
                      <div className={styles.msgFoot}>
                        <span>{hhmm(m.createdAt)}</span>
                        {mine ? (
                          confirmDel === m.id ? (
                            <>
                              <span className="muted">Excluir?</span>
                              <button className="link" type="button" onClick={() => remove(m.id)}>
                                Sim
                              </button>
                              <button className="link" type="button" onClick={() => setConfirmDel("")}>
                                Não
                              </button>
                            </>
                          ) : (
                            <button className="link" type="button" onClick={() => setConfirmDel(m.id)}>
                              Excluir
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className={`panel ${styles.composer}`} style={{ marginTop: 16 }}>
        <div className={styles.composerRow}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={`Escreva para ${otherName}…`}
          />
          <button className="btn" type="button" onClick={submit} disabled={sending || !body.trim()}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {err ? <div className="gerr">{err}</div> : null}
      </div>
    </>
  );
}
