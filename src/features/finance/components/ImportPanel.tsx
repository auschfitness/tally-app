"use client";

// Importar extrato (spec 11, fase B), dentro do painel de Finanças: arquivo → (colunas, se
// for um CSV desconhecido) → prévia com novas/já importadas → importar. A conta vem
// escolhida sozinha pelo número do OFX já visto; senão, a conta padrão.
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Select } from "@/components/shared/Select";
import { brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { importStatementAction, previewImportAction } from "../import-actions";
import { leafAccounts, type LedgerAccount } from "../domain";
import {
  decodeStatement,
  detectFormat,
  guessCsvMapping,
  parseCsv,
  parseOfx,
  splitCsv,
  statementPeriod,
  type CsvMapping,
  type Statement,
} from "../statement";
import { BankLogo } from "./BankLogo";
import styles from "../finance.module.css";

const PREVIEW_ROWS = 6;
const HEADER_SCAN_ROWS = 10;

type Step =
  | { kind: "file" }
  | { kind: "map"; filename: string; text: string; rows: string[][] }
  | { kind: "review"; filename: string; statement: Statement }
  | { kind: "done"; imported: number; duplicates: number };

function pickAccount(accounts: LedgerAccount[], acctId: string | null): string {
  const assets = leafAccounts(accounts, "asset");
  return (
    (acctId && assets.find((a) => a.statementAcctId === acctId)?.id) || assets.find((a) => a.isDefault)?.id || assets[0]?.id || ""
  );
}

export function ImportPanel({
  accounts,
  currency,
  onClassify,
  onClose,
}: {
  accounts: LedgerAccount[];
  currency: string;
  onClassify: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "file" });
  const [error, setError] = useState("");

  const readFile = async (file: File): Promise<void> => {
    setError("");
    const text = decodeStatement(new Uint8Array(await file.arrayBuffer()));
    const format = detectFormat(text, file.name);
    if (format === "ofx" || format === "ofc") {
      setStep({ kind: "review", filename: file.name, statement: parseOfx(text, format) });
      return;
    }
    if (format === "csv") {
      const rows = splitCsv(text);
      const mapping = guessCsvMapping(rows);
      if (mapping) setStep({ kind: "review", filename: file.name, statement: parseCsv(text, mapping) });
      else setStep({ kind: "map", filename: file.name, text, rows });
      return;
    }
    setError("Não reconheci esse arquivo. Exporte o extrato do banco em OFX, OFC ou CSV.");
  };

  if (step.kind === "map") {
    return (
      <CsvMapper
        rows={step.rows}
        onBack={() => setStep({ kind: "file" })}
        onDone={(mapping) => setStep({ kind: "review", filename: step.filename, statement: parseCsv(step.text, mapping) })}
      />
    );
  }
  if (step.kind === "review") {
    return (
      <Review
        filename={step.filename}
        statement={step.statement}
        accounts={accounts}
        currency={currency}
        onBack={() => setStep({ kind: "file" })}
        onDone={(imported, duplicates) => setStep({ kind: "done", imported, duplicates })}
      />
    );
  }
  if (step.kind === "done") {
    return (
      <div className={styles.panelForm}>
        <div className={styles.panelBody}>
          <div className={styles.emptyTitle}>
            {step.imported === 1 ? "1 lançamento importado" : `${step.imported} lançamentos importados`}
          </div>
          <p className="muted">
            {step.duplicates > 0 ? `${step.duplicates} já estavam no Mercy e ficaram de fora. ` : ""}
            Agora é só dizer a categoria de cada um.
          </p>
        </div>
        <div className={styles.panelFoot}>
          <button className={`btn ghost ${styles.press}`} type="button" onClick={onClose}>
            Fechar
          </button>
          {step.imported > 0 ? (
            <button className={`btn ${styles.press}`} type="button" onClick={onClassify}>
              Classificar agora
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  return <FileDrop error={error} onFile={(f) => void readFile(f)} onClose={onClose} />;
}

function FileDrop({ error, onFile, onClose }: { error: string; onFile: (file: File) => void; onClose: () => void }) {
  const [isOver, setIsOver] = useState(false);
  const onDrop = (e: DragEvent<HTMLLabelElement>): void => {
    e.preventDefault();
    setIsOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <label
          className={`${styles.dropZone}${isOver ? ` ${styles.on}` : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
        >
          <Upload aria-hidden="true" />
          <span className={styles.emptyTitle}>Arraste o extrato aqui</span>
          <span className="muted">ou toque para escolher o arquivo</span>
          <input
            type="file"
            className={styles.visuallyHidden}
            accept=".ofx,.ofc,.csv,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <p className={styles.hint}>
          No app ou site do banco, procure Extrato e escolha exportar em OFX (todos os bancos), OFC ou CSV (Nubank e Inter
          já são reconhecidos). O arquivo é lido aqui no seu aparelho.
        </p>
        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CsvMapper({ rows, onBack, onDone }: { rows: string[][]; onBack: () => void; onDone: (mapping: CsvMapping) => void }) {
  const [headerRow, setHeaderRow] = useState(0);
  const header = rows[headerRow] ?? [];
  const [dateCol, setDateCol] = useState(0);
  const [descriptionCol, setDescriptionCol] = useState(Math.min(1, header.length - 1));
  const [amountCol, setAmountCol] = useState(Math.min(2, header.length - 1));
  const columns = header.map((name, i) => ({ i, name: name || `Coluna ${i + 1}` }));
  const sample = rows[headerRow + 1] ?? [];

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <p className="muted">Não conheço esse modelo de CSV ainda. Diga onde está cada informação:</p>
        <div className="field">
          <label htmlFor="csv-header">Linha com os nomes das colunas</label>
          <Select id="csv-header" value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
            {rows.slice(0, HEADER_SCAN_ROWS).map((r, i) => (
              <option key={i} value={i}>
                {i + 1}: {r.join(" | ").slice(0, 60)}
              </option>
            ))}
          </Select>
        </div>
        <ColumnSelect id="csv-date" label="Data" columns={columns} sample={sample} value={dateCol} onChange={setDateCol} />
        <ColumnSelect id="csv-desc" label="Descrição" columns={columns} sample={sample} value={descriptionCol} onChange={setDescriptionCol} />
        <ColumnSelect id="csv-amount" label="Valor (negativo = saída)" columns={columns} sample={sample} value={amountCol} onChange={setAmountCol} />
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onBack}>
          Voltar
        </button>
        <button
          className={`btn ${styles.press}`}
          type="button"
          onClick={() => onDone({ headerRow, dateCol, amountCol, descriptionCols: [descriptionCol] })}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function ColumnSelect({
  id,
  label,
  columns,
  sample,
  value,
  onChange,
}: {
  id: string;
  label: string;
  columns: { i: number; name: string }[];
  sample: string[];
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {columns.map((c) => (
          <option key={c.i} value={c.i}>
            {c.name}
            {sample[c.i] ? ` (ex.: ${sample[c.i]})` : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Review({
  filename,
  statement,
  accounts,
  currency,
  onBack,
  onDone,
}: {
  filename: string;
  statement: Statement;
  accounts: LedgerAccount[];
  currency: string;
  onBack: () => void;
  onDone: (imported: number, duplicates: number) => void;
}) {
  const router = useRouter();
  const assets = leafAccounts(accounts, "asset");
  const [accountId, setAccountId] = useState(() => pickAccount(accounts, statement.acctId));
  const [existing, setExisting] = useState<Set<string> | null>(null);
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const period = statementPeriod(statement);
  const fitids = useMemo(() => statement.transactions.map((t) => t.fitid), [statement]);

  useEffect(() => {
    if (!accountId || fitids.length === 0) return;
    let isCurrent = true;
    setExisting(null);
    void previewImportAction(accountId, fitids).then((res) => {
      if (!isCurrent) return;
      if (res.success) setExisting(new Set(res.data.existing));
      else setError(res.message);
    });
    return () => {
      isCurrent = false;
    };
  }, [accountId, fitids]);

  const newCount = existing ? statement.transactions.filter((t) => !existing.has(t.fitid)).length : null;
  const account = assets.find((a) => a.id === accountId);

  const confirm = (): void => {
    setError("");
    startSaving(async () => {
      const res = await importStatementAction({ accountId, filename, format: statement.format, acctId: statement.acctId, transactions: statement.transactions });
      if (res.success) {
        router.refresh();
        onDone(res.data.imported, res.data.duplicates);
      } else setError(res.message);
    });
  };

  if (statement.transactions.length === 0) {
    return (
      <div className={styles.panelForm}>
        <div className={styles.panelBody}>
          <div className={styles.emptyTitle}>Nenhum lançamento no arquivo</div>
          <p className="muted">Confira se exportou o período certo no banco.</p>
        </div>
        <div className={styles.panelFoot}>
          <button className={`btn ghost ${styles.press}`} type="button" onClick={onBack}>
            Escolher outro arquivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <div className="muted">{filename}</div>
        <div className={styles.detailAmount}>
          {newCount == null ? "Conferindo…" : newCount === 1 ? "1 lançamento novo" : `${newCount} lançamentos novos`}
        </div>
        <p className="muted">
          {period ? `De ${brDate(period.from)} a ${brDate(period.to)}` : ""}
          {existing && existing.size > 0 ? ` · ${statement.transactions.length - (newCount ?? 0)} já importados ficam de fora` : ""}
        </p>

        <div className="field">
          <label htmlFor="imp-account">Conta</label>
          <div className={styles.accountSelect}>
            <BankLogo bankCode={account?.bankCode ?? null} />
            <Select id="imp-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {statement.transactions.slice(0, PREVIEW_ROWS).map((t) => (
          <div key={t.fitid} className={styles.reportRow}>
            <span className={styles.rowTitle}>
              {brDate(t.date)} · {t.description || "Sem descrição"}
            </span>
            <b className={t.amount > 0 ? styles.in : undefined}>
              {t.amount > 0 ? "+" : "−"}
              {money(Math.abs(t.amount), currency)}
            </b>
          </div>
        ))}
        {statement.transactions.length > PREVIEW_ROWS ? (
          <p className={styles.hint}>e mais {statement.transactions.length - PREVIEW_ROWS}…</p>
        ) : null}
        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onBack}>
          Voltar
        </button>
        <button className={`btn ${styles.press}`} type="button" disabled={isSaving || !accountId || newCount === 0} onClick={confirm}>
          {isSaving ? "Importando…" : newCount === 0 ? "Nada novo" : "Importar"}
        </button>
      </div>
    </div>
  );
}
