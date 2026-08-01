"use client";

// Plano de contas (Client). Árvore por tipo (Ativo, Passivo, Patrimônio, Receitas,
// Despesas), indentada por profundidade. Criar/editar/inativar/apagar conta — tudo
// Server Action gated por finance.manage. Conta com lançamentos não se apaga (inative).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { buildAccountTree, flattenTree } from "../domain";
import { saveAccountAction, setAccountActiveAction, deleteAccountAction } from "../actions";
import type { Account, AccountNode, AccountType } from "../types";
import styles from "../accounting.module.css";

const TYPE_OPTS: { value: AccountType; label: string }[] = [
  { value: "asset", label: "Ativo" },
  { value: "liability", label: "Passivo" },
  { value: "equity", label: "Patrimônio" },
  { value: "revenue", label: "Receitas" },
  { value: "expense", label: "Despesas" },
];

interface EditTarget {
  id: string | null;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
}

export function AccountsBoard({ accounts, usedIds }: { accounts: Account[]; usedIds: string[] }) {
  const router = useRouter();
  const used = useMemo(() => new Set(usedIds), [usedIds]);
  const groups = useMemo(() => buildAccountTree(accounts), [accounts]);
  const flat = useMemo(() => flattenTree(groups), [groups]);

  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggleActive(a: Account) {
    setBusy(a.id);
    setErr(null);
    const res = await setAccountActiveAction(a.id, !a.isActive);
    setBusy(null);
    if (!res.success) setErr(res.message);
    else router.refresh();
  }

  async function remove(a: Account) {
    if (!confirm(`Apagar a conta "${a.code} ${a.name}"? Isso não pode ser desfeito.`)) return;
    setBusy(a.id);
    setErr(null);
    const res = await deleteAccountAction(a.id);
    setBusy(null);
    if (!res.success) setErr(res.message);
    else router.refresh();
  }

  return (
    <div className="panel">
      <div className={styles.head}>
        <div>
          <strong>Plano de contas</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            A estrutura das suas contas contábeis. Já vem com um plano padrão — ajuste como precisar.
          </div>
        </div>
        <button
          className="btn sm"
          onClick={() => setEdit({ id: null, code: "", name: "", type: "expense", parentId: null })}
        >
          Nova conta
        </button>
      </div>

      {err ? <p className={styles.err}>{err}</p> : null}

      {groups.length === 0 ? (
        <div className="empty">Nenhuma conta no plano ainda.</div>
      ) : (
        <div className={styles.tree}>
          {groups.map((g) => (
            <div key={g.type}>
              {g.roots.map((r) => (
                <AccountRow
                  key={r.id}
                  node={r}
                  used={used}
                  busy={busy}
                  onEdit={(a) => setEdit({ id: a.id, code: a.code, name: a.name, type: a.type, parentId: a.parentId })}
                  onToggle={toggleActive}
                  onDelete={remove}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {edit ? (
        <AccountModal
          target={edit}
          accounts={flat}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AccountRow({
  node,
  used,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  node: AccountNode;
  used: Set<string>;
  busy: string | null;
  onEdit: (a: Account) => void;
  onToggle: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const isRoot = node.depth === 0;
  const hasLines = used.has(node.id);
  return (
    <>
      <div className={styles.acctRow}>
        <span className={styles.acctCode} style={{ paddingLeft: node.depth * 18 }}>
          {node.code}
        </span>
        <span className={`${styles.acctName}${isRoot ? " " + styles.root : ""}${node.isActive ? "" : " " + styles.inactive}`}>
          {node.name}
        </span>
        {!node.isActive ? <span className="muted" style={{ fontSize: 11 }}>inativa</span> : null}
        <span className={styles.acctSpacer} />
        <span className={styles.acctActions}>
          <button className="btn ghost sm" disabled={busy === node.id} onClick={() => onEdit(node)}>
            Editar
          </button>
          <button className="btn ghost sm" disabled={busy === node.id} onClick={() => onToggle(node)}>
            {node.isActive ? "Inativar" : "Reativar"}
          </button>
          {!hasLines ? (
            <button className="btn danger sm" disabled={busy === node.id} onClick={() => onDelete(node)}>
              Apagar
            </button>
          ) : null}
        </span>
      </div>
      {node.children.map((c) => (
        <AccountRow key={c.id} node={c} used={used} busy={busy} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </>
  );
}

function AccountModal({
  target,
  accounts,
  onClose,
  onSaved,
}: {
  target: EditTarget;
  accounts: AccountNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<AccountType>(target.type);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Pai possível: contas do mesmo tipo, exceto a própria.
  const parentOpts = accounts.filter((a) => a.type === type && a.id !== target.id);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setErr(null);
    setFieldErrors({});
    const res = await saveAccountAction({ success: true, data: undefined }, formData);
    setPending(false);
    if (res.success) onSaved();
    else {
      setErr(res.message);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={onSubmit}>
        <h3>{target.id ? "Editar conta" : "Nova conta"}</h3>
        {target.id ? <input type="hidden" name="id" value={target.id} /> : null}

        <div className="field">
          <label>Tipo</label>
          <Select name="type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {TYPE_OPTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          {fieldErrors.type ? <span className={styles.err}>{fieldErrors.type[0]}</span> : null}
        </div>

        <div className="field">
          <label>Código</label>
          <input name="code" defaultValue={target.code} placeholder="ex.: 5.1.07" autoComplete="off" />
          {fieldErrors.code ? <span className={styles.err}>{fieldErrors.code[0]}</span> : null}
        </div>

        <div className="field">
          <label>Nome</label>
          <input name="name" defaultValue={target.name} placeholder="ex.: Material de escritório" autoComplete="off" autoFocus />
          {fieldErrors.name ? <span className={styles.err}>{fieldErrors.name[0]}</span> : null}
        </div>

        <div className="field">
          <label>Conta-pai (opcional)</label>
          <Select name="parentId" defaultValue={target.parentId ?? ""}>
            <option value="">— nenhuma (conta de topo) —</option>
            {parentOpts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </Select>
        </div>

        {err ? <p className={styles.err}>{err}</p> : null}

        <div className="actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
