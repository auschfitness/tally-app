"use client";

import { Select } from "@/components/shared/Select";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agoLabel } from "@/lib/utils/date";
import { type ActionResult } from "@/lib/errors";
import { createPostAction, createTaskAction, toggleTaskAction, deleteTaskAction } from "../actions";
import type { Post, Task } from "../types";
import styles from "../coord.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function CoordBoard({ posts, tasks, assignees }: { posts: Post[]; tasks: Task[]; assignees: string[] }) {
  const [modal, setModal] = useState<"post" | "task" | null>(null);

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const byWho = new Map<string, number>();
  for (const t of tasks) if (!t.done) byWho.set(t.who || "—", (byWho.get(t.who || "—") ?? 0) + 1);
  const whoArr = [...byWho.entries()].map(([who, n]) => ({ who, n })).sort((a, b) => b.n - a.n);
  const maxw = Math.max(1, ...whoArr.map((x) => x.n));

  return (
    <>
      <h1 className="page">Coordenação</h1>
      <p className="sub">Quadro de avisos e tarefas das equipes</p>

      <div className="ministrip">
        <div><div className="mi-k">Avisos</div><div className="mi-v">{posts.length}</div></div>
        <div><div className="mi-k">Tarefas abertas</div><div className="mi-v">{total - done}</div></div>
        <div><div className="mi-k">Concluídas</div><div className="mi-v pos">{done}</div></div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Quadro de avisos</h3><button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setModal("post")}>+ Aviso</button></div>
          {posts.length ? posts.map((p) => (
            <div className={styles.post} key={p.id}>
              <div className={styles.pt}>{p.title}</div>
              <div className={styles.pb}>{p.body}</div>
              <div className={styles.pm}>{p.team} · {agoLabel(p.date)}</div>
            </div>
          )) : <div className="empty">Nenhum aviso ainda.</div>}
        </div>

        <div className="panel">
          <div className="ph"><h3>Tarefas</h3><button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setModal("task")}>+ Tarefa</button></div>
          <div className="muted" style={{ marginBottom: 6 }}>{done} de {total} concluídas · {pct}%</div>
          <div className="gbar" style={{ marginBottom: 14 }}><i className="healthy" style={{ width: `${pct}%` }} /></div>
          <div className={styles.todo}>
            {tasks.length ? tasks.map((t) => (
              <div className={`${styles.t}${t.done ? " " + styles.tDone : ""}`} key={t.id}>
                <form action={toggleTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value={String(t.done)} />
                  <button type="submit" className={`${styles.cbx}${t.done ? " " + styles.cbxDone : ""}`}>{t.done ? "✓" : ""}</button>
                </form>
                <span className={styles.tx}>{t.text}</span>
                <span className={styles.who}>{t.who || "—"}</span>
                <form action={deleteTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className={styles.del}>×</button>
                </form>
              </div>
            )) : <div className="empty">Sem tarefas.</div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph"><h3>Pendências por responsável</h3></div>
        {whoArr.length ? whoArr.map((x) => (
          <div className="engrow" key={x.who} style={{ cursor: "default" }}>
            <span className="englbl">{x.who}</span>
            <div className="engbar"><i style={{ width: `${Math.round((x.n / maxw) * 100)}%`, background: "var(--blue)" }} /></div>
            <span className="engn">{x.n}</span>
          </div>
        )) : <div className="empty">Nada pendente. Tudo concluído.</div>}
      </div>

      {modal === "post" ? <PostModal onClose={() => setModal(null)} /> : null}
      {modal === "task" ? <TaskModal assignees={assignees} onClose={() => setModal(null)} /> : null}
    </>
  );
}

function PostModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createPostAction, INITIAL);
  useEffect(() => { if (state.success && state !== INITIAL) { onClose(); router.refresh(); } }, [state, onClose, router]);
  const fe = state.success ? undefined : state.fieldErrors;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Novo aviso</h3>
        <div className="field"><label>Título</label><input name="title" autoFocus />{fe?.title ? <div className="gerr">{fe.title[0]}</div> : null}</div>
        <div className="field"><label>Mensagem</label><input name="body" /></div>
        <div className="field"><label>Equipe</label><input name="team" placeholder="Ex.: Louvor" /></div>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Publicando…" : "Publicar"}</button>
        </div>
      </form>
    </div>
  );
}

function TaskModal({ assignees, onClose }: { assignees: string[]; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTaskAction, INITIAL);
  useEffect(() => { if (state.success && state !== INITIAL) { onClose(); router.refresh(); } }, [state, onClose, router]);
  const fe = state.success ? undefined : state.fieldErrors;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Nova tarefa</h3>
        <div className="field"><label>Tarefa</label><input name="text" autoFocus />{fe?.text ? <div className="gerr">{fe.text[0]}</div> : null}</div>
        <div className="field">
          <label>Responsável</label>
          <Select name="who" defaultValue={assignees[0] ?? ""}>
            {assignees.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <div className="muted" style={{ marginTop: 5, fontSize: 11.5 }}>Só aparecem pessoas com cargo (líderes).</div>
        </div>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Adicionando…" : "Adicionar"}</button>
        </div>
      </form>
    </div>
  );
}
