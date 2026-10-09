import { describe, it, expect } from "vitest";
import { validateExit, validateField } from "./schema";

describe("validateField (fronteira da ficha)", () => {
  it("nome é obrigatório e vem aparado", () => {
    expect(validateField("name", "   ")).toEqual({ ok: false, error: "Informe o nome." });
    expect(validateField("name", "  Ruth Alves ")).toEqual({ ok: true, text: "Ruth Alves", value: "Ruth Alves" });
  });
  it("vazio limpa campos opcionais (null)", () => {
    expect(validateField("phone", "")).toEqual({ ok: true, text: "", value: null });
    expect(validateField("maritalStatus", "")).toEqual({ ok: true, text: "", value: null });
  });
  it("situação e líder não aceitam vazio; líder vira booleano", () => {
    expect(validateField("status", "").ok).toBe(false);
    expect(validateField("isLeader", "true")).toEqual({ ok: true, text: "true", value: true });
    expect(validateField("isLeader", "false")).toEqual({ ok: true, text: "false", value: false });
  });
  it("selects só aceitam as opções da lista", () => {
    expect(validateField("maritalStatus", "married").ok).toBe(true);
    expect(validateField("maritalStatus", "casado").ok).toBe(false);
    expect(validateField("status", "visitor_returning").ok).toBe(false);
  });
  it("CPF: dígitos verificadores; guarda só os dígitos", () => {
    expect(validateField("cpf", "529.982.247-25")).toEqual({ ok: true, text: "52998224725", value: "52998224725" });
    expect(validateField("cpf", "529.982.247-24")).toEqual({ ok: false, error: "CPF inválido." });
  });
  it("e-mail e telefone", () => {
    expect(validateField("email", "a@b").ok).toBe(false);
    expect(validateField("email", "a@b.com").ok).toBe(true);
    expect(validateField("phone", "(47) 99999-0000").ok).toBe(true);
    expect(validateField("phone", "abc").ok).toBe(false);
    expect(validateField("phone", "123").ok).toBe(false);
  });
  it("datas: reais, e nascimento não pode ser futuro", () => {
    expect(validateField("baptismDate", "2020-02-30").ok).toBe(false);
    expect(validateField("baptismDate", "2020-02-29").ok).toBe(true);
    expect(validateField("birthDate", "2030-01-01", "2026-10-09").ok).toBe(false);
    expect(validateField("birthDate", "1990-01-01", "2026-10-09").ok).toBe(true);
  });
  it("UF em maiúsculas e CEP formatado", () => {
    expect(validateField("state", "sc")).toEqual({ ok: true, text: "SC", value: "SC" });
    expect(validateField("postalCode", "89200000")).toEqual({ ok: true, text: "89200-000", value: "89200-000" });
  });
});

describe("validateExit", () => {
  it("exige data real e motivo da lista", () => {
    expect(validateExit("2026-10-01", "moved").ok).toBe(true);
    expect(validateExit("", "moved").ok).toBe(false);
    expect(validateExit("2026-10-01", "x").ok).toBe(false);
  });
});
