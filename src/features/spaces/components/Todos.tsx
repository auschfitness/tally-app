"use client";

// Tarefas de um espaço (Client). Listas de to-dos com itens atribuíveis. Criar lista =
// membro; renomear/arquivar = criador ou org.manage. Item: adicionar (membro), concluir/
// reabrir e editar (qualquer membro, colaborativo), excluir (criador ou org.manage, com
// confirmação inline). Ordem: não-concluídos primeiro, depois por position; concluídos
// ao fim. Sinais: prazo vencido discreto, "X de Y concluídas", nome do responsável.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { brDate } from "@/lib/utils/date";
import {
  addTodo,
  archiveTodoList,
  createTodoList,
  deleteTodo,
  editTodo,
  renameTodoList,
  toggleTodo,
} from "../actions";
import { canManage, isOverdue, progressLabel, sortTodos, todoProgress } from "../domain";
import type { OrgMember, Todo, TodoList } from "../types";
import styles from "../spaces.module.css";

export function Todos({
  spaceId,
  lists,
  members,
  userId,
  canManageOrg,
  todayIso,
}: {
  spaceId: string;
  lists: TodoList[];
  members: OrgMember[];
  userId: string;
  canManageOrg: boolean;
  todayIso: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submitList() {
    setSaving(true);
    setErr(null);
    const res = await createTodoList(spaceId, { name });
    setSaving(false);
    if (res.success) {
      setName("");
      setCreating(false);
      router.refresh();
    } else {
      setErr(res.message);
    }
  }

  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        {creating ? (
          <div className={styles.addForm}>
            <div className="field">
              <label>Nome da lista</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Preparativos do culto"
                autoFocus
              />
            </div>
            {err ? <div className="gerr">{err}</div> : null}
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => { setCreating(false); setErr(null); }}>
                Cancelar
              </button>
              <button className="btn" type="button" onClick={submitList} disabled={saving || !name.trim()}>
                {saving ? "Criando…" : "Criar lista"}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn" type="button" onClick={() => setCreating(true)}>
            Nova lista
          </button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="panel">
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Nenhuma lista de tarefas ainda.
            <br />
            <span className="muted">Crie a primeira com “Nova lista”.</span>
          </div>
        </div>
      ) : (
        lists.map((list) => (
          <TodoListCard
            key={list.id}
            spaceId={spaceId}
            list={list}
            members={members}
            userId={userId}
            canManageOrg={canManageOrg}
            todayIso={todayIso}
          />
        ))
      )}
    </>
  );
}

function TodoListCard({
  spaceId,
  list,
  members,
  userId,
  canManageOrg,
  todayIso,
}: {
  spaceId: string;
  list: TodoList;
  members: OrgMember[];
  userId: string;
  canManageOrg: boolean;
  todayIso: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canManageList = canManage(userId, list.createdBy, canManageOrg);
  const { done, total } = todoProgress(list.todos);
  const ordered = sortTodos(list.todos);

  async function saveRename() {
    const res = await renameTodoList(list.id, spaceId, { name });
    if (res.success) {
      setRenaming(false);
      router.refresh();
    } else {
      setErr(res.message);
    }
  }

  async function archive() {
    setConfirmArchive(false);
    const res = await archiveTodoList(list.id, spaceId);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className={styles.listHead}>
        {renaming ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ marginRight: "auto" }} />
            <button className="link" type="button" onClick={saveRename} disabled={!name.trim()}>Salvar</button>
            <button className="link" type="button" onClick={() => { setRenaming(false); setName(list.name); }}>Cancelar</button>
          </>
        ) : (
          <>
            <span className={styles.listName}>{list.name}</span>
            <span className={styles.progress}>{progressLabel(done, total)}</span>
            {canManageList ? (
              confirmArchive ? (
                <span className={styles.todoActions}>
                  <span className="muted" style={{ fontSize: 12.5 }}>Arquivar?</span>
                  <button className="link" type="button" onClick={archive}>Sim</button>
                  <button className="link" type="button" onClick={() => setConfirmArchive(false)}>Não</button>
                </span>
              ) : (
                <span className={styles.todoActions}>
                  <button className="link" type="button" onClick={() => { setRenaming(true); setErr(null); }}>Renomear</button>
                  <button className="link" type="button" onClick={() => setConfirmArchive(true)}>Arquivar</button>
                </span>
              )
            ) : null}
          </>
        )}
      </div>

      {total > 0 ? (
        <div className={styles.todoList}>
          {ordered.map((t) => (
            <TodoRow
              key={t.id}
              spaceId={spaceId}
              todo={t}
              members={members}
              userId={userId}
              canManageOrg={canManageOrg}
              todayIso={todayIso}
            />
          ))}
        </div>
      ) : (
        <div className="empty" style={{ padding: "14px 0" }}>Nenhuma tarefa nesta lista.</div>
      )}

      {err ? <div className="gerr" style={{ marginTop: 10 }}>{err}</div> : null}

      {adding ? (
        <TodoForm
          members={members}
          submitLabel="Adicionar"
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            const res = await addTodo(spaceId, list.id, values);
            if (res.success) {
              setAdding(false);
              router.refresh();
              return null;
            }
            return res.message;
          }}
        />
      ) : (
        <div style={{ marginTop: 12 }}>
          <button className="btn ghost sm" type="button" onClick={() => setAdding(true)}>
            + Adicionar tarefa
          </button>
        </div>
      )}
    </div>
  );
}

function TodoRow({
  spaceId,
  todo,
  members,
  userId,
  canManageOrg,
  todayIso,
}: {
  spaceId: string;
  todo: Todo;
  members: OrgMember[];
  userId: string;
  canManageOrg: boolean;
  todayIso: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canDelete = canManage(userId, todo.createdBy, canManageOrg);
  const overdue = isOverdue(todo.dueOn, todo.done, todayIso);

  async function toggle() {
    setBusy(true);
    await toggleTodo(todo.id, spaceId, !todo.done);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setConfirmDel(false);
    const res = await deleteTodo(todo.id, spaceId);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  if (editing) {
    return (
      <div className={styles.todoRow}>
        <div style={{ width: "100%" }}>
          <TodoForm
            members={members}
            initial={todo}
            submitLabel="Salvar"
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              const res = await editTodo(todo.id, spaceId, values);
              if (res.success) {
                setEditing(false);
                router.refresh();
                return null;
              }
              return res.message;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.todoRow}>
      <input
        type="checkbox"
        className={styles.todoCheck}
        checked={todo.done}
        disabled={busy}
        onChange={toggle}
        aria-label={todo.done ? "Reabrir tarefa" : "Concluir tarefa"}
      />
      <div className={styles.todoMain}>
        <div className={`${styles.todoTitle}${todo.done ? ` ${styles.todoDone}` : ""}`}>{todo.title}</div>
        {(todo.assigneeName || todo.dueOn) && (
          <div className={styles.todoMeta}>
            {todo.assigneeName ? <span className={styles.assignee}>{todo.assigneeName}</span> : null}
            {todo.dueOn ? (
              <span className={overdue ? styles.overdue : undefined}>
                {overdue ? "Vencida · " : "Prazo · "}
                {brDate(todo.dueOn)}
              </span>
            ) : null}
          </div>
        )}
        {todo.notes ? <div className={styles.todoNotes}>{todo.notes}</div> : null}
        {err ? <div className="gerr" style={{ marginTop: 6 }}>{err}</div> : null}
      </div>
      <div className={styles.todoActions}>
        {confirmDel ? (
          <>
            <span className="muted" style={{ fontSize: 12.5 }}>Excluir?</span>
            <button className="link" type="button" onClick={remove}>Sim</button>
            <button className="link" type="button" onClick={() => setConfirmDel(false)}>Não</button>
          </>
        ) : (
          <>
            <button className="link" type="button" onClick={() => setEditing(true)}>Editar</button>
            {canDelete ? (
              <button className="link" type="button" onClick={() => setConfirmDel(true)}>Excluir</button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// Formulário compartilhado de item (adicionar/editar). Devolve mensagem de erro ou null.
function TodoForm({
  members,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  members: OrgMember[];
  initial?: Todo;
  submitLabel: string;
  onSubmit: (values: { title: string; assigneeId: string; dueOn: string; notes: string }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? "");
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    const msg = await onSubmit({ title, assigneeId, dueOn, notes });
    setSaving(false);
    if (msg) setErr(msg);
  }

  return (
    <div className={styles.addForm}>
      <div className="field">
        <label>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" autoFocus />
      </div>
      <div className={styles.addGrid}>
        <div className="field">
          <label>Responsável (opcional)</label>
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label>Prazo (opcional)</label>
          <DateField value={dueOn} onChange={setDueOn} aria-label="Prazo" />
        </div>
      </div>
      <div className="field">
        <label>Notas (opcional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Detalhes, links…" />
      </div>
      {err ? <div className="gerr">{err}</div> : null}
      <div className="actions">
        <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>
        <button className="btn" type="button" onClick={submit} disabled={saving || !title.trim()}>
          {saving ? "Salvando…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
