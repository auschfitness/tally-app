// Leitura de extrato bancário (spec 11, fase B). Puro, roda no navegador: o arquivo nunca
// sobe cru, só as linhas já lidas. OFX 1.x é SGML (tags de folha sem fechamento), OFX 2.x é
// XML, OFC (formato antigo de BB/Itaú) tem as mesmas tags de transação — um leitor por
// bloco <STMTTRN> atende os três. CSV tem predefinição para Nubank e Inter e mapeamento
// manual para os demais.

export type StatementFormat = "ofx" | "ofc" | "csv";

export interface StatementTransaction {
  fitid: string; // identificador do banco (OFX/OFC) ou hash estável (CSV)
  date: string; // aaaa-mm-dd, sem fuso
  amount: number; // negativo = saída
  description: string;
}

export interface Statement {
  format: StatementFormat;
  bankId: string | null;
  acctId: string | null;
  transactions: StatementTransaction[];
}

// --- Texto ---------------------------------------------------------------------------

// Bancos brasileiros mandam OFX em windows-1252 com frequência. Usa o charset declarado no
// cabeçalho; sem declaração, tenta UTF-8 estrito e cai para windows-1252.
export function decodeStatement(bytes: Uint8Array): string {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 600));
  const declared = /CHARSET:\s*(\d+)/i.exec(head)?.[1] ?? /encoding="([^"]+)"/i.exec(head)?.[1] ?? "";
  if (/^(1252|windows-1252|iso-8859-1|8859-1|latin1)$/i.test(declared)) return new TextDecoder("windows-1252").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function detectFormat(text: string, filename: string): StatementFormat | null {
  if (/<OFX>/i.test(text)) return "ofx";
  if (/<OFC>/i.test(text)) return "ofc";
  if (/\.csv$/i.test(filename) || /^[^\n]*[;,][^\n]*\n/.test(text)) return "csv";
  return null;
}

// --- OFX / OFC -----------------------------------------------------------------------

function leaf(block: string, tag: string): string {
  const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
  return (m?.[1] ?? "").trim();
}

// "20261005120000[-3:BRT]" → "2026-10-05". Hora de banco não significa nada: corta.
function ofxDate(raw: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Valor do OFX vem com ponto; alguns bancos brasileiros mandam vírgula.
function ofxAmount(raw: string): number | null {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function parseOfx(text: string, format: "ofx" | "ofc" = "ofx"): Statement {
  const transactions: StatementTransaction[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/STMTRS>|$)/gi) ?? [];
  blocks.forEach((block, i) => {
    const date = ofxDate(leaf(block, "DTPOSTED"));
    const amount = ofxAmount(leaf(block, "TRNAMT"));
    if (!date || amount == null) return;
    const memo = leaf(block, "MEMO");
    const name = leaf(block, "NAME");
    const description = [name, memo].filter((s, idx, all) => s && all.indexOf(s) === idx).join(" · ") || leaf(block, "TRNTYPE");
    const fitid = leaf(block, "FITID") || `${date}|${amount}|${description}|${i}`;
    transactions.push({ fitid, date, amount, description });
  });
  return { format, bankId: leaf(text, "BANKID") || null, acctId: leaf(text, "ACCTID") || null, transactions };
}

// --- CSV -----------------------------------------------------------------------------

export interface CsvMapping {
  dateCol: number;
  descriptionCols: number[];
  amountCol: number;
  headerRow: number; // índice da linha de cabeçalho; os dados começam na seguinte
}

export function splitCsv(text: string): string[][] {
  const firstLines = text.split(/\r?\n/).slice(0, 10).join("\n");
  const delimiter = (firstLines.match(/;/g)?.length ?? 0) > (firstLines.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

// "05/10/2026", "05/10/26" ou "2026-10-05" → "2026-10-05".
export function csvDate(raw: string): string | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{2,4})/.exec(raw.trim());
  if (br) {
    const year = br[3]?.length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2]}-${br[1]}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

// "R$ -1.234,56", "-1234.56", "1.234,56-" → número. Vírgula decimal quando ela vem depois
// do último ponto (padrão brasileiro); senão ponto decimal (Nubank exporta assim).
export function csvAmount(raw: string): number | null {
  let s = raw.replace(/R\$|\s/g, "");
  const negative = /^-|-$|^\(.*\)$/.test(s);
  s = s.replace(/[-()]/g, "");
  if (!/\d/.test(s)) return null;
  s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round((negative ? -n : n) * 100) / 100 : null;
}

const normalize = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Predefinições: acha a linha de cabeçalho e as colunas pelo nome. Nubank: "Data, Valor,
// Identificador, Descrição". Inter: "Data Lançamento; Histórico; Descrição; Valor; Saldo".
export function guessCsvMapping(rows: string[][]): CsvMapping | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = (rows[r] ?? []).map(normalize);
    const dateCol = cells.findIndex((c) => c.startsWith("data"));
    const amountCol = cells.findIndex((c) => c === "valor" || c.startsWith("valor (") || c === "quantia");
    if (dateCol < 0 || amountCol < 0) continue;
    const descriptionCols = ["historico", "descricao", "lancamento", "titulo"]
      .map((name) => cells.findIndex((c) => c.startsWith(name)))
      .filter((i) => i >= 0 && i !== dateCol);
    if (descriptionCols.length === 0) continue;
    return { headerRow: r, dateCol, amountCol, descriptionCols };
  }
  return null;
}

// CSV não tem FITID: o identificador é data+valor+descrição+ocorrência. Duas linhas iguais
// no mesmo dia (duas ofertas de R$ 50 no Pix) viram #1 e #2, e reimportar o mesmo arquivo
// gera os mesmos ids — é o que impede duplicata.
export function parseCsv(text: string, mapping: CsvMapping): Statement {
  const rows = splitCsv(text).slice(mapping.headerRow + 1);
  const seen = new Map<string, number>();
  const transactions: StatementTransaction[] = [];
  for (const row of rows) {
    const date = csvDate(row[mapping.dateCol] ?? "");
    const amount = csvAmount(row[mapping.amountCol] ?? "");
    if (!date || amount == null || amount === 0) continue;
    const description = mapping.descriptionCols
      .map((c) => row[c] ?? "")
      .filter((s, idx, all) => s && all.indexOf(s) === idx)
      .join(" · ");
    const key = `${date}|${amount.toFixed(2)}|${normalize(description)}`;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    transactions.push({ fitid: `csv:${key}#${occurrence}`, date, amount, description });
  }
  return { format: "csv", bankId: null, acctId: null, transactions };
}

export function statementPeriod(s: Statement): { from: string; to: string } | null {
  if (s.transactions.length === 0) return null;
  const dates = s.transactions.map((t) => t.date).sort();
  return { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "" };
}
