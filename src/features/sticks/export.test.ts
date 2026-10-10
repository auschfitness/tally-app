import { describe, it, expect } from "vitest";
import { csvCell, peopleCsv, type ExportPerson } from "./export";

const base: ExportPerson = {
  name: "Ruth Alves", status: "member", office: "Diácono(isa)", phone: "47999990000", whatsapp: "", email: "ruth@x.com",
  birthDate: "1990-03-05", gender: "female", maritalStatus: "married", profession: "Professora", line1: "Rua A, 10", line2: "Centro",
  city: "Joinville", state: "SC", postalCode: "89200-000", baptismDate: "2010-06-01", membershipDate: null, cpf: "52998224725", rg: "123",
};

describe("peopleCsv", () => {
  it("usa BOM, ; e datas dd/mm/aaaa; sem CPF/RG sem permissão", () => {
    const out = peopleCsv([base], false);
    expect(out.startsWith("\uFEFFNome;Situação;")).toBe(true);
    expect(out).toContain("Ruth Alves;Membro;Diácono(isa);(47) 99999-0000;;ruth@x.com;05/03/1990;Feminino;Casado(a)");
    expect(out).not.toContain("CPF");
    expect(out).not.toContain("529.982.247-25");
  });
  it("com members.manage inclui CPF formatado e RG", () => {
    const out = peopleCsv([base], true);
    expect(out.split("\r\n")[0]).toMatch(/;CPF;RG$/);
    expect(out).toContain(";529.982.247-25;123");
  });
});

describe("csvCell", () => {
  it("aspas quando tem ; ou aspas; apóstrofo contra fórmula", () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+55 47 99999-0000")).toBe("+55 47 99999-0000");
  });
});
