"use client";

// Criar espaço (Client). Ação primária do hub, só para quem tem org.manage. Escolhe o
// tipo — Igreja (única por org), Ministério ou Grupo — e cria via Server Action. Ao
// criar, navega para o quadro do novo espaço.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { createSpace } from "../actions";
import { spaceKindSingular } from "../domain";
import type { CreateSpaceOptions, SpaceKind } from "../types";

const KINDS: { key: SpaceKind; label: string }[] = [
  { key: "church", label: "Igreja" },
  { key: "ministry", label: "Ministério" },
  { key: "group", label: "Grupo" },
];

export function NewSpace({ options }: { options: CreateSpaceOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SpaceKind>("church");
  const [refId, setRefId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setKind("church");
    setRefId("");
    setName("");
    setDescription("");
    setErr(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    const res = await createSpace({ kind, refId: refId || undefined, name, description });
    setSaving(false);
    if (res.success) {
      close();
      router.push(`/spaces/${res.data.id}`);
    } else {
      setErr(res.message);
    }
  }

  const churchTaken = kind === "church" && options.churchExists;
  const noRefs =
    (kind === "ministry" && options.ministries.length === 0) ||
    (kind === "group" && options.groups.length === 0);
  const disabled = saving || churchTaken || (kind !== "church" && (!refId || noRefs));

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        Novo espaço
      </button>

      {open ? (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>Novo espaço</h3>
            <p className="msub" style={{ marginTop: 0 }}>
              Um lugar de conversa para a igreja, um ministério ou um grupo.
            </p>

            <div className="field">
              <label>Tipo</label>
              <div className="filtchips">
                {KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    className={`fchip${kind === k.key ? " on" : ""}`}
                    onClick={() => {
                      setKind(k.key);
                      setRefId("");
                      setErr(null);
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {kind === "church" ? (
              <div className="field">
                <label>Nome (opcional)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Igreja"
                  disabled={churchTaken}
                />
                {churchTaken ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    A Igreja já tem um espaço — só pode haver um.
                  </div>
                ) : null}
              </div>
            ) : null}

            {kind === "ministry" ? (
              <div className="field">
                <label>Ministério</label>
                <Select value={refId} onChange={(e) => setRefId(e.target.value)}>
                  <option value="">Escolha o ministério…</option>
                  {options.ministries.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
                {options.ministries.length === 0 ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Todos os ministérios ativos já têm um espaço.
                  </div>
                ) : null}
              </div>
            ) : null}

            {kind === "group" ? (
              <div className="field">
                <label>Grupo</label>
                <Select value={refId} onChange={(e) => setRefId(e.target.value)}>
                  <option value="">Escolha o grupo…</option>
                  {options.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
                {options.groups.length === 0 ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Todos os grupos já têm um espaço.
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="field">
              <label>Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={`Sobre o que é este espaço de ${spaceKindSingular(kind).toLowerCase()}?`}
              />
            </div>

            {err ? <div className="gerr">{err}</div> : null}

            <div className="actions">
              <button className="btn ghost" type="button" onClick={close}>
                Cancelar
              </button>
              <button className="btn" type="button" onClick={submit} disabled={disabled}>
                {saving ? "Criando…" : "Criar espaço"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
