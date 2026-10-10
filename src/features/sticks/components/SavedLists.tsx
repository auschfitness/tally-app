"use client";

// Listas salvas (spec 13, B3): atalhos acima dos chips + botão "Salvar lista" quando há filtro.
// A lista guarda só os filtros (o mesmo objeto da querystring); clicar aplica. Quando a igreja
// ainda não tem nenhuma, aparecem sugestões: clicar APLICA o filtro (nada é criado sozinho).
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { Chip } from "@/features/study/components/FilterChips";
import { Popover } from "@/features/study/components/Popover";
import studyStyles from "@/features/study/study.module.css";
import { createPeopleListAction, deletePeopleListAction, renamePeopleListAction } from "../bulk-actions";
import { NO_FILTERS, filtersQuery, type PeopleFilters } from "../domain";
import type { SavedList } from "../types";
import styles from "../people.module.css";

const SUGGESTIONS: { name: string; filters: Partial<PeopleFilters> }[] = [
  { name: "Aniversariantes do mês", filters: { aniv: "este" } },
  { name: "Membros sem célula", filters: { s: "member", celula: "sem" } },
  { name: "Visitantes", filters: { s: "visitor" } },
];

const same = (a: PeopleFilters, b: Partial<PeopleFilters>): boolean => filtersQuery(a) === filtersQuery({ ...NO_FILTERS, ...b });

function NameForm({ initial, submit, label, onDone }: { initial: string; submit: (name: string) => Promise<string | null>; label: string; onDone: () => void }) {
  const [name, setName] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    const msg = await submit(name);
    setBusy(false);
    if (msg) setErr(msg);
    else onDone();
  }
  return (
    <form className={styles.exitForm} onSubmit={(e) => void go(e)}>
      <label className={styles.exitLabel}>
        Nome da lista
        <input className={styles.fInput} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Nome da lista" />
      </label>
      {err ? <p className={styles.fErr} role="alert">{err}</p> : null}
      <div className={styles.exitActions}>
        <button type="submit" className={styles.primary} disabled={busy}>{label}</button>
      </div>
    </form>
  );
}

export function SaveListButton({ filters, lists, onLists }: { filters: PeopleFilters; lists: SavedList[]; onLists: (next: SavedList[]) => void }) {
  const suggested = SUGGESTIONS.find((s) => same(filters, s.filters))?.name ?? "";
  return (
    <Popover trigger="Salvar lista" triggerClass="btn ghost sm" label="Salvar lista" haspopup="dialog">
      {(close) => (
        <NameForm
          key={suggested}
          initial={suggested}
          label="Salvar"
          submit={async (name) => {
            const r = await createPeopleListAction(name, filters);
            if (!r.success) return r.message;
            onLists([...lists, r.data]);
            return null;
          }}
          onDone={close}
        />
      )}
    </Popover>
  );
}

function SavedChip({
  list,
  active,
  canEdit,
  onApply,
  onExport,
  lists,
  onLists,
}: {
  list: SavedList;
  active: boolean;
  canEdit: boolean;
  onApply: () => void;
  onExport: () => void;
  lists: SavedList[];
  onLists: (next: SavedList[]) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <span className={styles.sl}>
      <Chip on={active} onClick={onApply}>{list.name}</Chip>
      <Popover trigger={<UiIcon icon={MoreHorizontal} />} triggerClass="iconbtn" label={`Mais ações da lista ${list.name}`}>
        {(close) =>
          renaming ? (
            <NameForm
              initial={list.name}
              label="Renomear"
              submit={async (name) => {
                const r = await renamePeopleListAction(list.id, name);
                if (!r.success) return r.message;
                onLists(lists.map((l) => (l.id === list.id ? { ...l, name: r.data.name } : l)));
                return null;
              }}
              onDone={() => {
                setRenaming(false);
                close();
              }}
            />
          ) : (
            <>
              <button type="button" role="menuitem" className={studyStyles.mi} onClick={() => { onExport(); close(); }}>Exportar</button>
              {canEdit ? (
                <>
                  <button type="button" role="menuitem" className={studyStyles.mi} onClick={() => setRenaming(true)}>Renomear</button>
                  <button
                    type="button"
                    role="menuitem"
                    className={studyStyles.mi}
                    onClick={() => {
                      close();
                      void deletePeopleListAction(list.id).then((r) => r.success && onLists(lists.filter((l) => l.id !== list.id)));
                    }}
                  >
                    Apagar
                  </button>
                </>
              ) : null}
            </>
          )
        }
      </Popover>
    </span>
  );
}

export function SavedListsRow({
  lists,
  filters,
  canEdit,
  onApply,
  onExport,
  onLists,
}: {
  lists: SavedList[];
  filters: PeopleFilters;
  canEdit: boolean;
  onApply: (f: PeopleFilters) => void;
  onExport: (list: SavedList) => void;
  onLists: (next: SavedList[]) => void;
}) {
  if (lists.length === 0) {
    const idle = !filtersQuery(filters);
    if (!canEdit || !idle) return null;
    return (
      <div className={styles.chips} role="group" aria-label="Sugestões de lista">
        <span className={styles.slHint}>Sugestões</span>
        {SUGGESTIONS.map((s) => (
          <Chip key={s.name} on={false} onClick={() => onApply({ ...NO_FILTERS, ...s.filters })}>{s.name}</Chip>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.chips} role="group" aria-label="Listas salvas">
      {lists.map((l) => (
        <SavedChip key={l.id} list={l} active={same(filters, l.filters)} canEdit={canEdit} onApply={() => onApply({ ...NO_FILTERS, ...l.filters })} onExport={() => onExport(l)} lists={lists} onLists={onLists} />
      ))}
    </div>
  );
}
