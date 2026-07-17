import { describe, it, expect } from "vitest";
import { parsePersonInput } from "./schema";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("parsePersonInput (validação de fronteira)", () => {
  it("aceita entrada válida e normaliza tipos", () => {
    const r = parsePersonInput(
      fd({ name: "  Ruth Alves ", relationship: "member", campus: "Sede", group: "Célula A", lastSeen: "2026-07-01", isLeader: "on", followup: "" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("Ruth Alves");
      expect(r.data.relationship).toBe("member");
      expect(r.data.isLeader).toBe(true);
      expect(r.data.followup).toBe(false);
    }
  });

  it("rejeita nome vazio com erro de campo", () => {
    const r = parsePersonInput(fd({ name: "   ", relationship: "member" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.name).toBeDefined();
  });

  it("relação inválida cai para 'member' (nunca inventa enum)", () => {
    const r = parsePersonInput(fd({ name: "Ana Souza", relationship: "hacker" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.relationship).toBe("member");
  });

  it("data de última presença malformada é erro de campo", () => {
    const r = parsePersonInput(fd({ name: "Ana Souza", relationship: "member", lastSeen: "01/07/2026" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.lastSeen).toBeDefined();
  });

  it("exige nome completo: rejeita um nome só", () => {
    for (const name of ["João", "Maria", "Ana P"]) {
      const r = parsePersonInput(fd({ name, relationship: "member" }));
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.fieldErrors.name).toBeDefined();
    }
  });

  it("exige nome completo: aceita nome e sobrenome", () => {
    for (const name of ["João Silva", "Ana Souza", "Maria de Lurdes"]) {
      const r = parsePersonInput(fd({ name, relationship: "member" }));
      expect(r.ok, name).toBe(true);
    }
  });
});
