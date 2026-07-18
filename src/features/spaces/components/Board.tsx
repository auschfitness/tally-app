"use client";

// Quadro de um espaço (Client). Ação primária "Novo post" (título + corpo). Lista os
// posts (já ordenados fixados-primeiro pela página); cada um leva ao post aberto. Autor
// ou org.manage pode fixar/arquivar direto da lista (arquivar com confirmação inline).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brDate } from "@/lib/utils/date";
import { createPost, togglePin, archivePost } from "../actions";
import { canManage, countLabel } from "../domain";
import type { PostListItem } from "../types";
import styles from "../spaces.module.css";

export function Board({
  spaceId,
  posts,
  userId,
  canManageOrg,
}: {
  spaceId: string;
  posts: PostListItem[];
  userId: string;
  canManageOrg: boolean;
}) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string>("");

  async function submit() {
    setSaving(true);
    setErr(null);
    const res = await createPost(spaceId, { title, body });
    setSaving(false);
    if (res.success) {
      setTitle("");
      setBody("");
      setComposing(false);
      router.push(`/spaces/${spaceId}/posts/${res.data.id}`);
    } else {
      setErr(res.message);
    }
  }

  async function onPin(postId: string) {
    setBusyId(postId);
    await togglePin(postId, spaceId);
    setBusyId(null);
    router.refresh();
  }

  async function onArchive(postId: string) {
    setConfirmArchive("");
    setBusyId(postId);
    const res = await archivePost(postId, spaceId);
    setBusyId(null);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        {composing ? (
          <div className={styles.form}>
            <div className="field">
              <label>Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Do que se trata este post?"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Mensagem</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Escreva para o espaço…"
              />
            </div>
            {err ? <div className="gerr">{err}</div> : null}
            <div className="actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setComposing(false);
                  setErr(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn"
                type="button"
                onClick={submit}
                disabled={saving || !title.trim() || !body.trim()}
              >
                {saving ? "Publicando…" : "Publicar post"}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn" type="button" onClick={() => setComposing(true)}>
            Novo post
          </button>
        )}
      </div>

      <div className="panel">
        <div className="ph">
          <h3 style={{ margin: 0 }}>Posts</h3>
        </div>
        {posts.length === 0 ? (
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Ainda não há posts neste espaço.
            <br />
            <span className="muted">Comece a conversa com o primeiro post.</span>
          </div>
        ) : (
          <div className={styles.postList}>
            {posts.map((p) => {
              const mine = canManage(userId, p.authorId, canManageOrg);
              return (
                <div key={p.id} className={styles.postItem}>
                  <div className={styles.postMain}>
                    <Link href={`/spaces/${spaceId}/posts/${p.id}`} className={styles.postTitle}>
                      {p.pinned ? <span className={styles.pin}>Fixado · </span> : null}
                      {p.title}
                    </Link>
                    <div className={styles.postMeta}>
                      {p.authorName} · {brDate(p.createdAt.slice(0, 10))} ·{" "}
                      {countLabel(p.commentCount, "comentário", "comentários")}
                    </div>
                  </div>
                  {mine ? (
                    <div className={styles.rowActions}>
                      {confirmArchive === p.id ? (
                        <>
                          <span className="muted" style={{ fontSize: 12.5 }}>Arquivar?</span>
                          <button className="link" type="button" onClick={() => onArchive(p.id)}>Sim</button>
                          <button className="link" type="button" onClick={() => setConfirmArchive("")}>Não</button>
                        </>
                      ) : (
                        <>
                          <button
                            className="link"
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => onPin(p.id)}
                          >
                            {p.pinned ? "Desafixar" : "Fixar"}
                          </button>
                          <button className="link" type="button" onClick={() => setConfirmArchive(p.id)}>
                            Arquivar
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
