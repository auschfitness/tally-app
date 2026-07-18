"use client";

// Post aberto (Client): título + corpo + autor/data, comentários (mais antigos primeiro)
// e a caixa "Comentar". Editar/excluir post e comentário só para autor ou org.manage,
// com confirmação de exclusão inline (sem window.confirm — controle temático).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { brDate } from "@/lib/utils/date";
import {
  addComment,
  deleteComment,
  deletePost,
  editComment,
  editPost,
} from "../actions";
import { canManage } from "../domain";
import type { Comment, PostDetail } from "../types";
import styles from "../spaces.module.css";

export function PostView({
  spaceId,
  post,
  comments,
  userId,
  canManageOrg,
}: {
  spaceId: string;
  post: PostDetail;
  comments: Comment[];
  userId: string;
  canManageOrg: boolean;
}) {
  const router = useRouter();

  // Edição do post
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [savingPost, setSavingPost] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [confirmDelPost, setConfirmDelPost] = useState(false);

  // Novo comentário
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [commentErr, setCommentErr] = useState<string | null>(null);

  // Edição/exclusão de comentário (por id)
  const [editCommentId, setEditCommentId] = useState<string>("");
  const [editCommentBody, setEditCommentBody] = useState("");
  const [confirmDelComment, setConfirmDelComment] = useState<string>("");

  const canManagePost = canManage(userId, post.authorId, canManageOrg);

  async function savePost() {
    setSavingPost(true);
    setPostErr(null);
    const res = await editPost(post.id, spaceId, { title, body });
    setSavingPost(false);
    if (res.success) {
      setEditing(false);
      router.refresh();
    } else {
      setPostErr(res.message);
    }
  }

  async function removePost() {
    setConfirmDelPost(false);
    const res = await deletePost(post.id, spaceId);
    if (res.success) router.push(`/spaces/${spaceId}`);
    else setPostErr(res.message);
  }

  async function submitComment() {
    setAddingComment(true);
    setCommentErr(null);
    const res = await addComment(post.id, spaceId, { body: newComment });
    setAddingComment(false);
    if (res.success) {
      setNewComment("");
      router.refresh();
    } else {
      setCommentErr(res.message);
    }
  }

  async function saveComment(id: string) {
    const res = await editComment(id, post.id, spaceId, { body: editCommentBody });
    if (res.success) {
      setEditCommentId("");
      router.refresh();
    } else {
      setCommentErr(res.message);
    }
  }

  async function removeComment(id: string) {
    setConfirmDelComment("");
    const res = await deleteComment(id, post.id, spaceId);
    if (res.success) router.refresh();
    else setCommentErr(res.message);
  }

  return (
    <>
      <div className="panel">
        {editing ? (
          <div className={styles.form}>
            <div className="field">
              <label>Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Mensagem</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
            </div>
            {postErr ? <div className="gerr">{postErr}</div> : null}
            <div className="actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setTitle(post.title);
                  setBody(post.body);
                  setPostErr(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn"
                type="button"
                onClick={savePost}
                disabled={savingPost || !title.trim() || !body.trim()}
              >
                {savingPost ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 className="page" style={{ marginRight: "auto" }}>
                {post.pinned ? <span className={styles.pin}>Fixado · </span> : null}
                {post.title}
              </h1>
              {canManagePost ? (
                <div className={styles.rowActions}>
                  {confirmDelPost ? (
                    <>
                      <span className="muted" style={{ fontSize: 12.5 }}>Excluir?</span>
                      <button className="link" type="button" onClick={removePost}>Sim</button>
                      <button className="link" type="button" onClick={() => setConfirmDelPost(false)}>Não</button>
                    </>
                  ) : (
                    <>
                      <button className="link" type="button" onClick={() => setEditing(true)}>Editar</button>
                      <button className="link" type="button" onClick={() => setConfirmDelPost(true)}>Excluir</button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="sub" style={{ margin: 0 }}>
              {post.authorName} · {brDate(post.createdAt.slice(0, 10))}
            </div>
            <div className={styles.postBody}>{post.body}</div>
            {postErr ? <div className="gerr" style={{ marginTop: 10 }}>{postErr}</div> : null}
          </>
        )}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph">
          <h3 style={{ margin: 0 }}>Comentários</h3>
        </div>

        {comments.length === 0 ? (
          <div className="empty">Nenhum comentário ainda.</div>
        ) : (
          <div className={styles.commentList}>
            {comments.map((c) => {
              const mine = canManage(userId, c.authorId, canManageOrg);
              return (
                <div key={c.id} className={styles.comment}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>{c.authorName}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{brDate(c.createdAt.slice(0, 10))}</span>
                    {mine ? (
                      <span className={styles.commentActions}>
                        {confirmDelComment === c.id ? (
                          <>
                            <span className="muted" style={{ fontSize: 12.5 }}>Excluir?</span>
                            <button className="link" type="button" onClick={() => removeComment(c.id)}>Sim</button>
                            <button className="link" type="button" onClick={() => setConfirmDelComment("")}>Não</button>
                          </>
                        ) : (
                          <>
                            <button
                              className="link"
                              type="button"
                              onClick={() => {
                                setEditCommentId(c.id);
                                setEditCommentBody(c.body);
                                setCommentErr(null);
                              }}
                            >
                              Editar
                            </button>
                            <button className="link" type="button" onClick={() => setConfirmDelComment(c.id)}>
                              Excluir
                            </button>
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>
                  {editCommentId === c.id ? (
                    <div className={styles.form}>
                      <textarea
                        value={editCommentBody}
                        onChange={(e) => setEditCommentBody(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="actions">
                        <button className="btn ghost" type="button" onClick={() => setEditCommentId("")}>
                          Cancelar
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => saveComment(c.id)}
                          disabled={!editCommentBody.trim()}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.commentBody}>{c.body}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.composer}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            placeholder="Escreva um comentário…"
          />
          {commentErr ? <div className="gerr">{commentErr}</div> : null}
          <div>
            <button
              className="btn"
              type="button"
              onClick={submitComment}
              disabled={addingComment || !newComment.trim()}
            >
              {addingComment ? "Enviando…" : "Comentar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
