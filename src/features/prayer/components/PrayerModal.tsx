"use client";

import { Select } from "@/components/shared/Select";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPrayerAction } from "../actions";
import { PRIVACY_OPTIONS, PRAYER_TOPICS } from "../domain";
import { type ActionResult } from "@/lib/errors";

const INITIAL: ActionResult = { success: true, data: undefined };

export function PrayerModal({ authorDefault, onClose }: { authorDefault: string; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createPrayerAction, INITIAL);
  const [topics, setTopics] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function addCustom() {
    const t = custom.trim();
    if (t && !topics.some((x) => x.toLowerCase() === t.toLowerCase())) setTopics((prev) => [...prev, t]);
    setCustom("");
  }
  // Chips: a lista fixa + os temas personalizados que o usuário adicionou.
  const chips = [...PRAYER_TOPICS, ...topics.filter((t) => !PRAYER_TOPICS.includes(t))];

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
        <h3>Novo pedido de oração</h3>
        <div className="field">
          <label>Nome do pedido</label>
          <input name="title" placeholder="Ex.: Saúde da mãe da Ruth" />
        </div>
        <div className="field">
          <label>Pedido</label>
          <input name="request" placeholder="Escreva o pedido..." autoFocus />
          {fieldErrors?.request ? <div className="gerr">{fieldErrors.request[0]}</div> : null}
        </div>
        <div className="mrow">
          <div className="field">
            <label>Quem vê</label>
            <Select name="privacy" defaultValue="church">
              {PRIVACY_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Grupo (opcional)</label>
            <input name="group" placeholder="Ex.: Mulheres" />
          </div>
        </div>
        <div className="field">
          <label>Qual o motivo?</label>
          <input type="hidden" name="topics" value={topics.join(",")} />
          <div className="filtchips" style={{ marginTop: 2 }}>
            {chips.map((t) => (
              <button
                key={t}
                type="button"
                className={`fchip${topics.includes(t) ? " on" : ""}`}
                onClick={() => toggleTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Adicionar outro tema…"
            />
            <button type="button" className="btn ghost sm" onClick={addCustom}>Adicionar</button>
          </div>
        </div>
        <div className="field">
          <label>Nome</label>
          <input name="author" defaultValue={authorDefault} placeholder="Seu nome ou Anônimo" />
        </div>
        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Publicando…" : "Publicar"}</button>
        </div>
      </form>
    </div>
  );
}
