import { describe, it, expect } from "vitest";
import { csvAmount, csvDate, decodeStatement, detectFormat, guessCsvMapping, parseCsv, parseOfx, splitCsv, statementPeriod } from "./statement";

// Bytes em latin1/windows-1252 (como o Itaú e o BB mandam): um byte por caractere.
const latin1Bytes = (s: string): Uint8Array => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

// OFX 1.x (SGML): tags de folha sem fechamento, cabeçalho com CHARSET:1252, data com fuso.
const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>0341<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261001<DTEND>20261007
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005120000[-3:BRT]
<TRNAMT>350.00
<FITID>202610050001
<MEMO>PIX RECEBIDO JOÃO ESTÊVÃO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261006
<TRNAMT>-189,90
<FITID>202610060002
<NAME>CEMIG
<MEMO>CONTA DE LUZ
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

// OFX 2.x (XML), como o Nubank exporta.
const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0260</BANKID><ACCTID>987654-3</ACCTID></BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261003000000[-3:BRT]</DTPOSTED><TRNAMT>100.00</TRNAMT><FITID>abc-1</FITID><MEMO>Transferência recebida pelo Pix</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261004000000[-3:BRT]</DTPOSTED><TRNAMT>-40.00</TRNAMT><FITID>abc-2</FITID><MEMO>Compra no débito</MEMO></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

// OFC (formato antigo que o BB ainda oferece).
const OFC = `<OFC>
<DTSERVER>20261007
<ACCTSTMT>
<ACCTFROM><BANKID>001<ACCTID>55555-X</ACCTFROM>
<STMTRS>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261002
<TRNAMT>-1500.00
<FITID>OFC0001
<CHKNUM>000123
<MEMO>ALUGUEL
</STMTTRN>
</STMTRS>
</ACCTSTMT>
</OFC>`;

const NUBANK_CSV = `Data,Valor,Identificador,Descrição
05/10/2026,350.00,uuid-1,Transferência recebida pelo Pix - MARIA
05/10/2026,50.00,uuid-2,Transferência recebida pelo Pix - OFERTA
05/10/2026,50.00,uuid-3,Transferência recebida pelo Pix - OFERTA
06/10/2026,-189.90,uuid-4,"Pagamento de boleto - CEMIG, outubro"`;

const INTER_CSV = `Extrato Conta Corrente
Conta ;12345678
Período ;01/10/2026 a 07/10/2026

Data Lançamento;Histórico;Descrição;Valor;Saldo
02/10/2026;Pix recebido;Fulano de Tal;1.250,00;1.250,00
03/10/2026;Pagamento efetuado;Aluguel do templo;-1.000,00;250,00`;

describe("decodeStatement", () => {
  it("respeita CHARSET:1252 e mantém os acentos", () => {
    expect(decodeStatement(latin1Bytes(OFX_SGML))).toContain("JOÃO ESTÊVÃO");
  });

  it("UTF-8 válido fica como está; inválido cai para windows-1252", () => {
    expect(decodeStatement(new TextEncoder().encode("Transferência"))).toBe("Transferência");
    expect(decodeStatement(latin1Bytes("Doação"))).toBe("Doação");
  });
});

describe("detectFormat", () => {
  it("reconhece OFX, OFC e CSV", () => {
    expect(detectFormat(OFX_SGML, "extrato.ofx")).toBe("ofx");
    expect(detectFormat(OFX_XML, "nubank.ofx")).toBe("ofx");
    expect(detectFormat(OFC, "bb.ofc")).toBe("ofc");
    expect(detectFormat(NUBANK_CSV, "nubank.csv")).toBe("csv");
    expect(detectFormat("qualquer coisa", "foto.png")).toBeNull();
  });
});

describe("parseOfx", () => {
  it("lê OFX 1.x SGML: conta, data sem fuso, valor com vírgula e descrição juntando nome e memo", () => {
    const s = parseOfx(decodeStatement(latin1Bytes(OFX_SGML)));
    expect(s.bankId).toBe("0341");
    expect(s.acctId).toBe("12345-6");
    expect(s.transactions).toEqual([
      { fitid: "202610050001", date: "2026-10-05", amount: 350, description: "PIX RECEBIDO JOÃO ESTÊVÃO" },
      { fitid: "202610060002", date: "2026-10-06", amount: -189.9, description: "CEMIG · CONTA DE LUZ" },
    ]);
  });

  it("lê OFX 2.x XML", () => {
    const s = parseOfx(OFX_XML);
    expect(s.acctId).toBe("987654-3");
    expect(s.transactions.map((t) => [t.fitid, t.date, t.amount])).toEqual([
      ["abc-1", "2026-10-03", 100],
      ["abc-2", "2026-10-04", -40],
    ]);
  });

  it("lê OFC", () => {
    const s = parseOfx(OFC, "ofc");
    expect(s.format).toBe("ofc");
    expect(s.acctId).toBe("55555-X");
    expect(s.transactions).toEqual([{ fitid: "OFC0001", date: "2026-10-02", amount: -1500, description: "ALUGUEL" }]);
  });
});

describe("CSV", () => {
  it("csvDate e csvAmount nos formatos brasileiros", () => {
    expect(csvDate("05/10/2026")).toBe("2026-10-05");
    expect(csvDate("05/10/26")).toBe("2026-10-05");
    expect(csvDate("2026-10-05")).toBe("2026-10-05");
    expect(csvAmount("R$ -1.234,56")).toBe(-1234.56);
    expect(csvAmount("1.234,56-")).toBe(-1234.56);
    expect(csvAmount("-189.90")).toBe(-189.9);
    expect(csvAmount("abc")).toBeNull();
  });

  it("splitCsv respeita aspas e detecta ponto e vírgula", () => {
    expect(splitCsv(NUBANK_CSV)[4]).toEqual(["06/10/2026", "-189.90", "uuid-4", "Pagamento de boleto - CEMIG, outubro"]);
    expect(splitCsv(INTER_CSV)[3]).toEqual(["Data Lançamento", "Histórico", "Descrição", "Valor", "Saldo"]);
  });

  it("predefinição do Nubank: ofertas iguais no mesmo dia viram #1 e #2", () => {
    const mapping = guessCsvMapping(splitCsv(NUBANK_CSV));
    expect(mapping).toEqual({ headerRow: 0, dateCol: 0, amountCol: 1, descriptionCols: [3] });
    const s = parseCsv(NUBANK_CSV, mapping ?? { headerRow: 0, dateCol: 0, amountCol: 1, descriptionCols: [3] });
    expect(s.transactions).toHaveLength(4);
    const offers = s.transactions.filter((t) => t.description.endsWith("OFERTA"));
    expect(offers.map((t) => t.fitid.slice(-2))).toEqual(["#1", "#2"]);
    expect(parseCsv(NUBANK_CSV, mapping ?? { headerRow: 0, dateCol: 0, amountCol: 1, descriptionCols: [3] }).transactions.map((t) => t.fitid)).toEqual(
      s.transactions.map((t) => t.fitid),
    );
  });

  it("predefinição do Inter: pula o cabeçalho do banco e junta histórico e descrição", () => {
    const mapping = guessCsvMapping(splitCsv(INTER_CSV));
    expect(mapping).toEqual({ headerRow: 3, dateCol: 0, amountCol: 3, descriptionCols: [1, 2] });
    const s = parseCsv(INTER_CSV, mapping ?? { headerRow: 3, dateCol: 0, amountCol: 3, descriptionCols: [1, 2] });
    expect(s.transactions.map((t) => [t.date, t.amount, t.description])).toEqual([
      ["2026-10-02", 1250, "Pix recebido · Fulano de Tal"],
      ["2026-10-03", -1000, "Pagamento efetuado · Aluguel do templo"],
    ]);
    expect(statementPeriod(s)).toEqual({ from: "2026-10-02", to: "2026-10-03" });
  });
});
