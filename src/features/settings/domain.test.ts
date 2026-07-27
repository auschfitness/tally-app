import { describe, it, expect } from "vitest";
import {
  isCurrency,
  isTimezone,
  readInstitution,
  readAccount,
  visibleAdminTabs,
  resolveAdminTab,
  hasAnyAdminTab,
  type AdminPerms,
} from "./domain";

describe("validadores de opção", () => {
  it("moeda/fuso só aceitam valores conhecidos", () => {
    expect(isCurrency("BRL")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
    expect(isTimezone("America/Sao_Paulo")).toBe(true);
    expect(isTimezone("Mars/Base")).toBe(false);
  });
});

describe("readInstitution (leitura segura do blob)", () => {
  it("lê multiInstitution + lista de strings", () => {
    const data = { institution: { multiInstitution: true, institutions: ["Sede", "Filial", 42] }, outra: 1 };
    expect(readInstitution(data)).toEqual({ multiInstitution: true, institutions: ["Sede", "Filial"] });
  });
  it("defaults seguros quando ausente/malformado", () => {
    expect(readInstitution(null)).toEqual({ multiInstitution: false, institutions: [] });
    expect(readInstitution({ institution: "x" })).toEqual({ multiInstitution: false, institutions: [] });
  });
});

describe("readAccount (leitura segura do blob — só fuso)", () => {
  it("lê fuso válido", () => {
    expect(readAccount({ account: { timezone: "America/Chicago" } })).toEqual({ timezone: "America/Chicago" });
  });
  it("cai no default quando inválido/ausente", () => {
    expect(readAccount({})).toEqual({ timezone: "America/Sao_Paulo" });
    expect(readAccount({ account: { timezone: "zzz" } })).toEqual({ timezone: "America/Sao_Paulo" });
  });
});

// Helper: permissões explícitas para os testes (o mundo real acopla org→fiscal, mas a
// função pura só filtra pelos booleans dados).
function perms(over: Partial<AdminPerms> = {}): AdminPerms {
  return { canManageOrg: false, canManageMembers: false, canManageFiscal: false, ...over };
}

describe("abas da Administração — visibilidade por permissão", () => {
  it("com todas as permissões, mostra todas na ordem canônica", () => {
    expect(visibleAdminTabs(perms({ canManageOrg: true, canManageMembers: true, canManageFiscal: true }))).toEqual([
      "geral",
      "cargos",
      "juridico",
      "membros",
      "conta",
    ]);
  });

  it("só members.manage → Cargos + Membros + Conta", () => {
    expect(visibleAdminTabs(perms({ canManageMembers: true }))).toEqual(["cargos", "membros", "conta"]);
  });

  it("só o gate fiscal → Jurídico + Conta", () => {
    expect(visibleAdminTabs(perms({ canManageFiscal: true }))).toEqual(["juridico", "conta"]);
  });

  it("só org.manage → Geral + Conta", () => {
    expect(visibleAdminTabs(perms({ canManageOrg: true }))).toEqual(["geral", "conta"]);
  });

  it("sem nenhuma permissão administrativa → só Conta (pessoal, sempre visível)", () => {
    expect(visibleAdminTabs(perms())).toEqual(["conta"]);
  });

  it("hasAnyAdminTab: true se há alguma aba além de Conta; false se só Conta", () => {
    expect(hasAnyAdminTab(perms({ canManageMembers: true }))).toBe(true);
    expect(hasAnyAdminTab(perms())).toBe(false);
  });
});

describe("abas da Administração — aba efetiva (query ?tab=)", () => {
  const visible = visibleAdminTabs(perms({ canManageMembers: true, canManageFiscal: true })); // cargos, juridico, membros, conta

  it("respeita a aba pedida quando o usuário pode vê-la", () => {
    expect(resolveAdminTab("juridico", visible)).toBe("juridico");
    expect(resolveAdminTab("membros", visible)).toBe("membros");
  });

  it("cai na primeira visível quando a pedida não é permitida", () => {
    expect(resolveAdminTab("geral", visible)).toBe("cargos"); // geral não está visível
  });

  it("sem aba pedida (ou lixo) → primeira visível", () => {
    expect(resolveAdminTab(undefined, visible)).toBe("cargos");
    expect(resolveAdminTab("xyz", visible)).toBe("cargos");
  });

  it("com só Conta visível, sempre resolve para Conta", () => {
    expect(resolveAdminTab("geral", ["conta"])).toBe("conta");
    expect(resolveAdminTab(undefined, ["conta"])).toBe("conta");
  });
});
