"use client";

// Ordem do culto (Client — Server Actions): lista os itens do template, permite
// reordenar (↑/↓), editar e remover, e adicionar item. Modal embutido.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanItemAction, deletePlanItemAction, movePlanItemAction, updatePlanItemAction } from "../actions";
import type { PlanItem } from "../types";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function PlanPanel({ serviceId, items }: { serviceId: string; items: PlanItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [creating, setCreating] = useState(false);

  async function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remover este item da ordem?")) {
      e.preventDefault();
      return;
    }
    setTimeout(() => router.refresh(), 400);
  }

  return (
    <div className="panel">
      <div className="ph">
        <h3>Ordem do culto</h3>
        <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}>+ Item</button>
      </div>

      {items.length === 0 ? (
        <div className="empty">Sem ordem definida. Monte a sequência do culto (louvor, avisos, mensagem…).</div>
      ) : (
        items.map((it, i) => {
          const meta: string[] = [];
          if (it.duration_min) meta.push(it.duration_min + " min");
          if (it.responsible) meta.push(it.responsible);
          return (
            <div className="li" key={it.id}>
              <div className="av">{it.time_label ? it.time_label : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div><b>{it.title}</b></div>
                {meta.length ? <div className="meta">{meta.join(" · ")}</div> : null}
              </div>
              <div className="right">
                <MoveForm id={it.id} serviceId={serviceId} dir={-1} hidden={i === 0} label="↑" />
                <MoveForm id={it.id} serviceId={serviceId} dir={1} hidden={i === items.length - 1} label="↓" />
                <button className="link" onClick={() => setEditing(it)}>editar</button>
                <form action={deletePlanItemAction} style={{ display: "inline" }} onSubmit={confirmDelete}>
                  <input type="hidden" name="id" value={it.id} />
                  <input type="hidden" name="serviceId" value={serviceId} />
                  <button className="link" type="submit">×</button>
                </form>
              </div>
            </div>
          );
        })
      )}

      {creating ? <PlanItemModal serviceId={serviceId} onClose={() => setCreating(false)} /> : null}
      {editing ? <PlanItemModal serviceId={serviceId} item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function MoveForm({ id, serviceId, dir, hidden, label }: { id: string; serviceId: string; dir: -1 | 1; hidden: boolean; label: string }) {
  const router = useRouter();
  return (
    <form action={movePlanItemAction} style={{ display: "inline", visibility: hidden ? "hidden" : "visible" }} onSubmit={() => setTimeout(() => router.refresh(), 400)}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="dir" value={dir} />
      <button className="link" type="submit">{label}</button>
    </form>
  );
}

function PlanItemModal({ serviceId, item, onClose }: { serviceId: string; item?: PlanItem; onClose: () => void }) {
  const router = useRouter();
  const isNew = !item;
  const [state, formAction, pending] = useActionState(isNew ? createPlanItemAction : updatePlanItemAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>{isNew ? "Novo item da ordem" : "Editar item"}</h3>
        <input type="hidden" name="serviceId" value={serviceId} />
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <div className="mrow">
          <div className="field"><label>Horário</label><input name="timeLabel" defaultValue={item?.time_label ?? ""} placeholder="Ex.: 09:00" /></div>
          <div className="field"><label>Duração (min)</label><input name="durationMin" type="number" min={0} defaultValue={item?.duration_min ?? ""} /></div>
        </div>
        <div className="field">
          <label>Título</label>
          <input name="title" defaultValue={item?.title ?? ""} placeholder="Ex.: Louvor, Avisos, Mensagem" autoFocus />
          {fieldErrors?.title ? <div className="gerr">{fieldErrors.title[0]}</div> : null}
        </div>
        <div className="field"><label>Responsável</label><input name="responsible" defaultValue={item?.responsible ?? ""} placeholder="Opcional" /></div>
        <div className="field"><label>Notas</label><textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} placeholder="Opcional" /></div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : isNew ? "Adicionar" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
