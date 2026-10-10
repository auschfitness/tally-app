"use client";

// Importar planilha de pessoas (spec 13, B1), dentro do Panel de Finanças (mesmo painel lateral /
// folha de baixo). Passos: arquivo, colunas, prévia, importando, resumo. O arquivo é lido no
// aparelho; só as linhas já limpas sobem, 200 por vez, uma Server Action de cada vez.
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { Select } from "@/components/shared/Select";
import { Chip } from "@/features/study/components/FilterChips";
import fin from "@/features/finance/finance.module.css";
import { existingKeysAction, importPeopleAction, type ImportSummary } from "../bulk-actions";
import { formatCpf } from "../domain";
import {
  BATCH_SIZE,
  IMPORT_FIELDS,
  buildRows,
  classifyRows,
  guessMapping,
  readSheet,
  type Existing,
  type ImportField,
  type ImportRow,
  type Mapping,
  type RowKind,
} from "../import";
import styles from "../people.module.css";

const PREVIEW_ROWS = 5;
const ERRORS_SHOWN = 5;
const today = (): string => new Date().toISOString().slice(0, 10);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

type Step =
  | { kind: "file" }
  | { kind: "map"; headers: string[]; rows: string[][]; mapping: Mapping }
  | { kind: "review"; rows: ImportRow[]; mapping: Mapping }
  | { kind: "run"; done: number; total: number }
  | { kind: "done"; summary: ImportSummary; skippedHere: number; failed: string };

export function ImportPeople({ canDocs, onClose }: { canDocs: boolean; onClose: (changed: boolean) => void }) {
  const [step, setStep] = useState<Step>({ kind: "file" });
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const close = () => onClose(changed);

  async function readFile(file: File) {
    setError("");
    const { headers, rows } = readSheet(new Uint8Array(await file.arrayBuffer()));
    if (headers.length === 0 || rows.length === 0) return void setError("Não achei pessoas nesse arquivo. Confira se a primeira linha tem os títulos das colunas.");
    const mapping = guessMapping(headers).map((f) => (!canDocs && (f === "cpf" || f === "rg") ? "" : f));
    setStep({ kind: "map", headers, rows, mapping });
  }

  if (step.kind === "map") {
    return (
      <Mapper
        headers={step.headers}
        rows={step.rows}
        mapping={step.mapping}
        canDocs={canDocs}
        onBack={() => setStep({ kind: "file" })}
        onNext={(mapping) => setStep({ kind: "review", rows: buildRows(step.rows, mapping, today()), mapping })}
      />
    );
  }
  if (step.kind === "review") {
    return (
      <Review
        rows={step.rows}
        mapping={step.mapping}
        onBack={() => setStep({ kind: "file" })}
        onRun={(mode, kinds) => void run(step.rows, kinds, mode)}
      />
    );
  }
  if (step.kind === "run") {
    return (
      <div className={fin.panelForm}>
        <div className={fin.panelBody}>
          <div className={fin.emptyTitle}>Importando…</div>
          <div className={styles.bar} role="progressbar" aria-label="Progresso da importação" aria-valuemin={0} aria-valuemax={step.total} aria-valuenow={step.done}>
            <div className={styles.barFill} style={{ "--p": `${step.total ? Math.round((step.done / step.total) * 100) : 0}%` } as React.CSSProperties} />
          </div>
          <p className="muted">{step.done} de {plural(step.total, "pessoa", "pessoas")}</p>
        </div>
      </div>
    );
  }
  if (step.kind === "done") {
    const s = step.summary;
    const skipped = s.skipped + step.skippedHere;
    return (
      <div className={fin.panelForm}>
        <div className={fin.panelBody}>
          <div className={fin.emptyTitle}>{step.failed ? "Importação interrompida" : "Importação concluída"}</div>
          <p>
            {[
              plural(s.created, "pessoa nova", "pessoas novas"),
              s.updated ? plural(s.updated, "atualizada", "atualizadas") : "",
              skipped ? plural(skipped, "pulada (já existia)", "puladas (já existiam)") : "",
              s.errors.length ? plural(s.errors.length, "linha com erro", "linhas com erro") : "",
            ]
              .filter(Boolean)
              .join(", ")}
            .
          </p>
          {step.failed ? <p className="gerr" role="alert">{step.failed} Corrija e envie a planilha de novo: quem já entrou será pulado.</p> : null}
          <ErrorList errors={s.errors} />
        </div>
        <div className={fin.panelFoot}>
          <button type="button" className="btn" onClick={close}>Fechar</button>
        </div>
      </div>
    );
  }
  return <FileDrop error={error} onFile={(f) => void readFile(f)} onClose={close} />;

  async function run(rows: ImportRow[], kinds: RowKind[], mode: "skip" | "fill") {
    const send = rows.flatMap((r, i) => (kinds[i] === "new" || (mode === "fill" && kinds[i] === "exists") ? [{ line: r.line, values: r.values }] : []));
    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: rows.flatMap((r) => (r.error ? [{ line: r.line, message: r.error }] : [])) };
    const skippedHere = mode === "skip" ? kinds.filter((k) => k === "exists").length : 0;
    let failed = "";
    for (let i = 0; i < send.length; i += BATCH_SIZE) {
      setStep({ kind: "run", done: i, total: send.length });
      const r = await importPeopleAction(send.slice(i, i + BATCH_SIZE), mode);
      if (!r.success) {
        failed = r.message;
        break;
      }
      summary.created += r.data.created;
      summary.updated += r.data.updated;
      summary.skipped += r.data.skipped;
      summary.errors.push(...r.data.errors);
      if (r.data.created || r.data.updated) setChanged(true);
    }
    setStep({ kind: "done", summary, skippedHere, failed });
  }
}

function ErrorList({ errors }: { errors: { line: number; message: string }[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className={styles.impErrors}>
      {errors.slice(0, ERRORS_SHOWN).map((e) => (
        <li key={e.line}>Linha {e.line}: {e.message}</li>
      ))}
      {errors.length > ERRORS_SHOWN ? <li>E mais {errors.length - ERRORS_SHOWN}.</li> : null}
    </ul>
  );
}

function FileDrop({ error, onFile, onClose }: { error: string; onFile: (file: File) => void; onClose: () => void }) {
  const [over, setOver] = useState(false);
  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  return (
    <div className={fin.panelForm}>
      <div className={fin.panelBody}>
        <label
          className={`${fin.dropZone}${over ? ` ${fin.on}` : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <Upload aria-hidden="true" />
          <span className={fin.emptyTitle}>Arraste a planilha aqui</span>
          <span className="muted">ou toque para escolher o arquivo</span>
          <input
            type="file"
            className={fin.visuallyHidden}
            accept=".csv,.txt,text/csv"
            aria-label="Arquivo da planilha"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className={fin.hint}>
          Salve a planilha como CSV (no Excel: Arquivo, Salvar como, CSV). A primeira linha deve ter os títulos das colunas. O arquivo é lido
          aqui no seu aparelho.
        </p>
        {error ? <div className="gerr" role="alert">{error}</div> : null}
      </div>
      <div className={fin.panelFoot}>
        <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function Mapper({ headers, rows, mapping: initial, canDocs, onBack, onNext }: { headers: string[]; rows: string[][]; mapping: Mapping; canDocs: boolean; onBack: () => void; onNext: (m: Mapping) => void }) {
  const [mapping, setMapping] = useState<Mapping>(initial);
  const fields = IMPORT_FIELDS.filter(([f]) => canDocs || (f !== "cpf" && f !== "rg"));
  const hasName = mapping.includes("name");
  const sample = rows[0] ?? [];
  return (
    <div className={fin.panelForm}>
      <div className={fin.panelBody}>
        <p className="muted">Diga o que é cada coluna. Já tentei adivinhar pelos títulos; o que ficar em Ignorar não entra.</p>
        {headers.map((h, i) => (
          <div className="field" key={i}>
            <label htmlFor={`col-${i}`}>
              {h || `Coluna ${i + 1}`}
              {sample[i] ? <span className={styles.impSample}> (ex.: {sample[i]})</span> : null}
            </label>
            <Select id={`col-${i}`} value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => m.map((v, j) => (j === i ? (e.target.value as ImportField | "") : v)))}>
              <option value="">Ignorar</option>
              {fields.map(([f, label]) => (
                <option key={f} value={f}>{label}</option>
              ))}
            </Select>
          </div>
        ))}
        {hasName ? null : <p className="gerr">Escolha qual coluna é o Nome.</p>}
      </div>
      <div className={fin.panelFoot}>
        <button type="button" className="btn ghost" onClick={onBack}>Voltar</button>
        <button type="button" className="btn" disabled={!hasName} onClick={() => onNext(mapping)}>Continuar</button>
      </div>
    </div>
  );
}

function Review({ rows, mapping, onBack, onRun }: { rows: ImportRow[]; mapping: Mapping; onBack: () => void; onRun: (mode: "skip" | "fill", kinds: RowKind[]) => void }) {
  const [existing, setExisting] = useState<Existing | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"skip" | "fill">("skip");

  useEffect(() => {
    let alive = true;
    void existingKeysAction().then((r) => {
      if (!alive) return;
      if (r.success) setExisting({ names: new Set(r.data.names), cpfs: new Set(r.data.cpfs) });
      else setErr(r.message);
    });
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(() => (existing ? classifyRows(rows, existing) : null), [rows, existing]);
  const cols = IMPORT_FIELDS.filter(([f]) => mapping.includes(f));
  const kindLabel = (k: RowKind | undefined): string => (k === "new" ? "Nova" : k === "exists" ? "Já existe" : "Erro");
  const errors = rows.flatMap((r) => (r.error ? [{ line: r.line, message: r.error }] : []));

  if (err) {
    return (
      <div className={fin.panelForm}>
        <div className={fin.panelBody}><p className="gerr" role="alert">{err}</p></div>
        <div className={fin.panelFoot}><button type="button" className="btn ghost" onClick={onBack}>Voltar</button></div>
      </div>
    );
  }
  if (!result) {
    return (
      <div className={fin.panelForm}>
        <div className={fin.panelBody}><p className="muted">Conferindo quem já está cadastrado…</p></div>
      </div>
    );
  }
  const toSend = result.news + (mode === "fill" ? result.exists : 0);
  return (
    <div className={fin.panelForm}>
      <div className={fin.panelBody}>
        <p className={styles.impCounts} data-testid="import-counts">
          {plural(result.news, "nova", "novas")}, {plural(result.exists, "já existe", "já existem")}, {plural(result.errors, "com erro", "com erro")}
        </p>

        <div className={styles.impTableWrap}>
          <table className={styles.impTable}>
            <thead>
              <tr>
                {cols.slice(0, 1).map(([f, label]) => (
                  <th key={f}>{label}</th>
                ))}
                <th>Situação</th>
                {cols.slice(1).map(([f, label]) => (
                  <th key={f}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                <tr key={r.line}>
                  {cols.slice(0, 1).map(([f]) => (
                    <td key={f}>{r.values[f] ?? ""}</td>
                  ))}
                  <td>{kindLabel(result.kinds[i])}</td>
                  {cols.slice(1).map(([f]) => (
                    <td key={f}>{f === "cpf" && r.values.cpf ? formatCpf(r.values.cpf) : r.values[f] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > PREVIEW_ROWS ? <p className={fin.hint}>Mostrando as {PREVIEW_ROWS} primeiras de {rows.length} linhas.</p> : null}
        <ErrorList errors={errors} />

        {result.exists > 0 ? (
          <div className={styles.impMode} role="group" aria-label="Quem já existe">
            <span className={styles.impModeLabel}>Quem já existe</span>
            <Chip on={mode === "skip"} onClick={() => setMode("skip")}>Pular</Chip>
            <Chip on={mode === "fill"} onClick={() => setMode("fill")}>Atualizar campos vazios</Chip>
          </div>
        ) : null}
      </div>
      <div className={fin.panelFoot}>
        <button type="button" className="btn ghost" onClick={onBack}>Voltar</button>
        <button type="button" className="btn" disabled={toSend === 0} onClick={() => onRun(mode, result.kinds)}>
          {toSend === 0 ? "Nada para importar" : `Importar ${plural(toSend, "pessoa", "pessoas")}`}
        </button>
      </div>
    </div>
  );
}
