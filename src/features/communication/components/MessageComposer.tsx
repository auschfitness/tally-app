"use client";

// Compor (Client — Server Actions). Assunto + corpo com {nome}, escolha do público
// (Todos/Grupo/Signal/Cuidado/Manual), pré-visualização dos destinatários (quem
// recebe × quem é pulado) e registro do envio ("Preparar envio"). A entrega real é
// passo posterior do orquestrador — a tela deixa isso claro.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { resolveRecipients, queueMessage, saveTemplate, type ResolvePreview } from "../actions";
import { AUDIENCE_KINDS, applyPlaceholder, usesPlaceholder } from "../domain";
import type { AudienceKind, AudienceOptions, AudienceRef, StickOption, Template } from "../types";
import styles from "../communication.module.css";

const SIGNAL_SEP = "␟";

export function MessageComposer({
  options,
  manualSticks,
  templates,
  onQueued,
}: {
  options: AudienceOptions;
  manualSticks: StickOption[];
  templates: Template[];
  onQueued: () => void;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<AudienceKind>("all");

  const [groupId, setGroupId] = useState("");
  const [signalKey, setSignalKey] = useState(""); // "type␟category"
  const [manual, setManual] = useState<Set<string>>(new Set());
  const [manualQuery, setManualQuery] = useState("");

  const [preview, setPreview] = useState<ResolvePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<{ queued: number; skipped: number } | null>(null);

  function currentRef(): AudienceRef {
    if (kind === "group") return { groupId };
    if (kind === "signal") {
      const [type, category] = signalKey.split(SIGNAL_SEP);
      return { signalType: type, signalCategory: category };
    }
    if (kind === "manual") return { stickIds: [...manual] };
    return {};
  }

  function composeInput() {
    return { channel: "email" as const, subject, body, audienceKind: kind, audienceRef: currentRef() };
  }

  // Qualquer mudança invalida a prévia anterior (o público pode ter mudado).
  function invalidate() {
    setPreview(null);
    setDone(null);
  }

  async function doPreview() {
    setPreviewing(true);
    setErr(null);
    setFieldErrors({});
    const res = await resolveRecipients(composeInput());
    setPreviewing(false);
    if (res.success) {
      setPreview(res.data);
    } else {
      setPreview(null);
      setErr(res.message);
      setFieldErrors(res.fieldErrors ?? {});
    }
  }

  async function doQueue() {
    setSending(true);
    setErr(null);
    const res = await queueMessage(composeInput());
    setSending(false);
    if (res.success) {
      setDone({ queued: res.data.queued, skipped: res.data.skipped });
      setPreview(null);
      setSubject("");
      setBody("");
      setManual(new Set());
      router.refresh();
      onQueued();
    } else {
      setErr(res.message);
      setFieldErrors(res.fieldErrors ?? {});
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    invalidate();
  }

  async function onSaveTemplate() {
    const name = window.prompt("Nome do modelo:");
    if (!name) return;
    const res = await saveTemplate({ name, subject, body });
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  const filteredManual = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    const list = q ? manualSticks.filter((s) => s.name.toLowerCase().includes(q)) : manualSticks;
    return list.slice(0, 60);
  }, [manualSticks, manualQuery]);

  const previewName = preview?.recipients[0]?.name ?? "Maria";

  return (
    <div className={styles.compose}>
      {/* Coluna 1: composição */}
      <div className="panel">
        <div className="ph"><h3>Mensagem</h3></div>

        {templates.length > 0 ? (
          <div className="field">
            <label>Usar um modelo (opcional)</label>
            <Select defaultValue="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = ""; }}>
              <option value="">Escolha um modelo…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="field">
          <label>Assunto</label>
          <input
            value={subject}
            onChange={(e) => { setSubject(e.target.value); invalidate(); }}
            placeholder="Ex.: Aviso do culto de domingo"
          />
          {fieldErrors.subject ? <div className="gerr">{fieldErrors.subject[0]}</div> : null}
        </div>

        <div className="field">
          <label>Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); invalidate(); }}
            rows={9}
            placeholder="Escreva a mensagem. Use {nome} para chamar cada pessoa pelo nome."
          />
          <div className={styles.hint}>
            Dica: <code>{"{nome}"}</code> vira o nome de cada pessoa no envio (apelido, quando houver).
          </div>
          {fieldErrors.body ? <div className="gerr">{fieldErrors.body[0]}</div> : null}
        </div>

        {usesPlaceholder(body) ? (
          <div className="field">
            <label>Prévia (para {previewName})</label>
            <div className={styles.bodyPreview}>{applyPlaceholder(body, previewName)}</div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button className="btn ghost sm" type="button" onClick={onSaveTemplate} disabled={!body.trim()}>
            Salvar como modelo
          </button>
        </div>
      </div>

      {/* Coluna 2: público + pré-visualização */}
      <div className="panel">
        <div className="ph"><h3>Público</h3></div>

        <div className="field">
          <label>Quem recebe</label>
          <div className="filtchips">
            {AUDIENCE_KINDS.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`fchip${kind === a.key ? " on" : ""}`}
                onClick={() => { setKind(a.key); invalidate(); }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className={styles.audienceHints}>{AUDIENCE_KINDS.find((a) => a.key === kind)?.hint}</div>
        </div>

        {kind === "group" ? (
          <div className="field">
            <label>Grupo</label>
            <Select value={groupId} onChange={(e) => { setGroupId(e.target.value); invalidate(); }}>
              <option value="">Escolha o grupo…</option>
              {options.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            {options.groups.length === 0 ? <div className="muted">Nenhum grupo ativo.</div> : null}
          </div>
        ) : null}

        {kind === "signal" ? (
          <div className="field">
            <label>Signal ativo</label>
            <Select value={signalKey} onChange={(e) => { setSignalKey(e.target.value); invalidate(); }}>
              <option value="">Escolha o Signal…</option>
              {options.signals.map((s) => (
                <option key={`${s.type}${SIGNAL_SEP}${s.category}`} value={`${s.type}${SIGNAL_SEP}${s.category}`}>
                  {s.category} · {s.type} ({s.count})
                </option>
              ))}
            </Select>
            {options.signals.length === 0 ? <div className="muted">Nenhum Signal ativo com pessoa vinculada.</div> : null}
          </div>
        ) : null}

        {kind === "care" ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            Pessoas com um cuidado em aberto. O motivo do cuidado não aparece aqui nem no registro.
          </div>
        ) : null}

        {kind === "manual" ? (
          <div className="field">
            <label>Pessoas ({manual.size} selecionada{manual.size === 1 ? "" : "s"})</label>
            <input
              placeholder="Buscar pessoa…"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className={styles.manualBox}>
              {filteredManual.map((s) => {
                const on = manual.has(s.id);
                return (
                  <label key={s.id} className={styles.manualRow}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = new Set(manual);
                        if (on) next.delete(s.id); else next.add(s.id);
                        setManual(next);
                        invalidate();
                      }}
                    />
                    <span>{s.name}</span>
                    <span style={{ marginLeft: "auto", color: "var(--text-2)", fontSize: 12 }}>
                      {s.email || "sem e-mail"}
                    </span>
                  </label>
                );
              })}
              {filteredManual.length === 0 ? <div className="empty">Ninguém encontrado.</div> : null}
            </div>
          </div>
        ) : null}

        {fieldErrors.audience ? <div className="gerr">{fieldErrors.audience[0]}</div> : null}

        <div style={{ marginTop: 8 }}>
          <button className="btn ghost" type="button" onClick={doPreview} disabled={previewing}>
            {previewing ? "Resolvendo…" : "Pré-visualizar destinatários"}
          </button>
        </div>

        {err ? <div className="gerr" style={{ marginTop: 10 }}>{err}</div> : null}

        {done ? (
          <div className="panel" style={{ marginTop: 12, background: "var(--surface-2, rgba(0,0,0,0.02))" }}>
            <b>Envio preparado.</b>{" "}
            {done.queued} destinatário(s) na fila{done.skipped > 0 ? `, ${done.skipped} pulado(s)` : ""}. Veja no
            histórico.
            <div className={styles.deliveryNote}>
              Preparado ≠ enviado: abra a mensagem no histórico e use “Enviar agora” para disparar a entrega.
            </div>
          </div>
        ) : null}

        {preview ? (
          <div style={{ marginTop: 14 }}>
            <div className={styles.counts}>
              <div>
                <div className="mi-k">Recebem</div>
                <div className={`${styles.countBig} pos`}>{preview.recipients.length}</div>
              </div>
              <div>
                <div className="mi-k">Pulados</div>
                <div className={styles.countBig}>{preview.skipped.length}</div>
              </div>
            </div>

            <div className={styles.previewList}>
              {preview.recipients.map((r) => (
                <div key={`r-${r.stickId}`} className={styles.recRow}>
                  <span>{r.name}</span>
                  <span className="em">{r.email}</span>
                </div>
              ))}
              {preview.skipped.map((s) => (
                <div key={`s-${s.stickId}`} className={styles.recRow}>
                  <span className="muted">{s.name}</span>
                  <span className="em">pulado · {s.reason}</span>
                </div>
              ))}
              {preview.recipients.length === 0 && preview.skipped.length === 0 ? (
                <div className="empty">Nenhuma pessoa neste público.</div>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn" type="button" onClick={doQueue} disabled={sending || preview.recipients.length === 0}>
                {sending ? "Preparando…" : `Preparar envio (${preview.recipients.length})`}
              </button>
              <div className={styles.deliveryNote}>
                Isso só registra e prepara o envio. A entrega é disparada depois, em “Enviar agora”.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
