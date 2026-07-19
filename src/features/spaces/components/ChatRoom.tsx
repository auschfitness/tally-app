"use client";

// Sala de chat ao vivo de um espaço (Client, estilo Campfire). Histórico (mais antigas no
// topo) + caixa de envio; tempo real via Realtime do Supabase (INSERT em
// space_chat_messages filtrado por space_id), deduplicando por id para não repetir a
// própria mensagem (que já entra otimista). "Carregar mais antigas" pagina para trás.
// Excluir a própria (ou org.manage) com confirmação inline. Rola pro fim ao chegar
// mensagem nova só se o usuário já estiver no fim.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteChatMessage, loadOlderChat, sendChatMessage } from "../actions";
import { canManage, chatDayLabel, groupChatByDay, mergeChat, showAuthorLine } from "../domain";
import type { ChatMessage } from "../types";
import styles from "../spaces.module.css";

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatRoom({
  spaceId,
  myId,
  canManageOrg,
  nameById,
  todayIso,
  initialMessages,
  initialHasMore,
}: {
  spaceId: string;
  myId: string;
  canManageOrg: boolean;
  nameById: Record<string, string>;
  todayIso: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true); // começa no fim (histórico rola pro fundo)
  const pendingPrependRef = useRef<number | null>(null); // scrollHeight antes de prepend

  const nameOf = useCallback(
    (id: string) => nameById[id] ?? (id === myId ? "Você" : "Usuário"),
    [nameById, myId],
  );

  // Assinatura de tempo real: novas mensagens deste espaço entram sem recarregar.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`space-chat-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "space_chat_messages", filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const r = payload.new as { id: string; sender_id: string; body: string; created_at: string };
          const msg: ChatMessage = {
            id: r.id,
            senderId: r.sender_id,
            senderName: nameOf(r.sender_id),
            body: r.body,
            createdAt: r.created_at,
          };
          setMessages((prev) => mergeChat(prev, [msg]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [spaceId, nameOf]);

  // Depois de cada mudança na lista: preserva a posição ao prepend ("mais antigas") ou
  // rola pro fim se o usuário já estava no fim. Layout effect evita "piscar".
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pendingPrependRef.current != null) {
      el.scrollTop = el.scrollHeight - pendingPrependRef.current;
      pendingPrependRef.current = null;
    } else if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  async function loadOlder() {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    setErr(null);
    const oldest = messages[0]!.createdAt;
    const res = await loadOlderChat(spaceId, oldest);
    setLoadingOlder(false);
    if (res.success) {
      if (res.data.messages.length > 0) {
        pendingPrependRef.current = scrollRef.current?.scrollHeight ?? 0;
        setMessages((prev) => mergeChat(res.data.messages, prev));
      }
      setHasMore(res.data.hasMore);
    } else {
      setErr(res.message);
    }
  }

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setErr(null);
    const res = await sendChatMessage(spaceId, { body: text });
    setSending(false);
    if (res.success) {
      setBody("");
      atBottomRef.current = true; // sou o remetente → sempre desce
      const mine: ChatMessage = {
        id: res.data.id,
        senderId: myId,
        senderName: nameOf(myId),
        body: text,
        createdAt: res.data.createdAt,
      };
      setMessages((prev) => mergeChat(prev, [mine])); // otimista; o eco do canal é deduplicado
    } else {
      setErr(res.message);
    }
  }

  async function remove(id: string) {
    setConfirmDel("");
    const res = await deleteChatMessage(id, spaceId);
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } else {
      setErr(res.message);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const days = groupChatByDay(messages);

  return (
    <>
      <div className={`panel ${styles.chatPanel}`} ref={scrollRef} onScroll={onScroll}>
        {hasMore ? (
          <div className={styles.chatLoadMore}>
            <button className="link" type="button" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Carregando…" : "Carregar mais antigas"}
            </button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Nenhuma mensagem ainda.
            <br />
            <span className="muted">Diga um oi para começar a conversa deste espaço.</span>
          </div>
        ) : (
          days.map((g) => (
            <div key={g.day} style={{ display: "contents" }}>
              <div className={styles.daySep}>{chatDayLabel(g.day, todayIso)}</div>
              {g.messages.map((m, i) => {
                const prev = i > 0 ? g.messages[i - 1]! : null;
                const showAuthor = showAuthorLine(prev, m);
                const mine = m.senderId === myId;
                const canDelete = canManage(myId, m.senderId, canManageOrg);
                return (
                  <div key={m.id} className={styles.chatMsg} style={{ marginTop: showAuthor ? 10 : 2 }}>
                    {showAuthor ? (
                      <div className={styles.chatAuthor}>
                        <span className={styles.chatName}>{mine ? "Você" : m.senderName}</span>
                        <span className={styles.chatTime}>{hhmm(m.createdAt)}</span>
                      </div>
                    ) : null}
                    <div className={styles.chatRow}>
                      <div className={styles.chatBody}>{m.body}</div>
                      {canDelete ? (
                        confirmDel === m.id ? (
                          <span className={styles.chatActions}>
                            <span className="muted" style={{ fontSize: 12 }}>Excluir?</span>
                            <button className="link" type="button" onClick={() => remove(m.id)}>Sim</button>
                            <button className="link" type="button" onClick={() => setConfirmDel("")}>Não</button>
                          </span>
                        ) : (
                          <button
                            className={`link ${styles.chatDel}`}
                            type="button"
                            onClick={() => setConfirmDel(m.id)}
                          >
                            Excluir
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className={`panel ${styles.composer}`} style={{ marginTop: 12 }}>
        <div className={styles.composerRow}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Escreva uma mensagem…"
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
