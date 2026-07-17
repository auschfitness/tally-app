import { describe, it, expect } from "vitest";
import { resolvePeriod, inPeriod, periodButtonLabel, presetLabel } from "./period";

// Data de referência fixa (injetada): quinta, 16/07/2026.
const NOW = new Date(2026, 6, 16); // mês 0-based: 6 = julho

describe("resolvePeriod", () => {
  it("Hoje = intervalo de um dia", () => {
    expect(resolvePeriod("today", NOW)).toEqual({ from: "2026-07-16", to: "2026-07-16" });
  });

  it("Ontem = dia anterior, cruzando o início do mês", () => {
    expect(resolvePeriod("yesterday", NOW)).toEqual({ from: "2026-07-15", to: "2026-07-15" });
    expect(resolvePeriod("yesterday", new Date(2026, 6, 1))).toEqual({
      from: "2026-06-30",
      to: "2026-06-30",
    });
  });

  it("Últimos 7 e 14 dias incluem hoje", () => {
    expect(resolvePeriod("7d", NOW)).toEqual({ from: "2026-07-10", to: "2026-07-16" });
    expect(resolvePeriod("14d", NOW)).toEqual({ from: "2026-07-03", to: "2026-07-16" });
  });

  it("Este mês = primeiro ao último dia do mês corrente", () => {
    expect(resolvePeriod("thisMonth", NOW)).toEqual({ from: "2026-07-01", to: "2026-07-31" });
    // fevereiro não-bissexto termina em 28
    expect(resolvePeriod("thisMonth", new Date(2026, 1, 10))).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("Mês anterior = mês fechado imediatamente antes, cruzando o ano", () => {
    expect(resolvePeriod("lastMonth", NOW)).toEqual({ from: "2026-06-01", to: "2026-06-30" });
    expect(resolvePeriod("lastMonth", new Date(2026, 0, 15))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("Últimos 3/6/12 meses recuam a partir de hoje", () => {
    expect(resolvePeriod("3m", NOW)).toEqual({ from: "2026-04-16", to: "2026-07-16" });
    expect(resolvePeriod("6m", NOW)).toEqual({ from: "2026-01-16", to: "2026-07-16" });
    expect(resolvePeriod("12m", NOW)).toEqual({ from: "2025-07-16", to: "2026-07-16" });
  });

  it("Todo o período = sem limites", () => {
    expect(resolvePeriod("all", NOW)).toEqual({ from: null, to: null });
  });

  it("Personalizado repassa as datas informadas (ou null)", () => {
    expect(resolvePeriod("custom", NOW, { from: "2026-01-01", to: "2026-03-31" })).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
    });
    expect(resolvePeriod("custom", NOW)).toEqual({ from: null, to: null });
  });
});

describe("inPeriod", () => {
  const range = { from: "2026-07-01", to: "2026-07-31" };
  it("inclui as pontas e exclui fora do intervalo", () => {
    expect(inPeriod("2026-07-01", range)).toBe(true);
    expect(inPeriod("2026-07-31", range)).toBe(true);
    expect(inPeriod("2026-06-30", range)).toBe(false);
    expect(inPeriod("2026-08-01", range)).toBe(false);
  });
  it("intervalo aberto (Todo o período) aceita qualquer data", () => {
    expect(inPeriod("1999-01-01", { from: null, to: null })).toBe(true);
  });
  it("uma ponta aberta limita só o outro lado", () => {
    expect(inPeriod("2026-05-10", { from: "2026-06-01", to: null })).toBe(false);
    expect(inPeriod("2026-07-10", { from: "2026-06-01", to: null })).toBe(true);
  });
  it("data vazia/nula nunca entra", () => {
    expect(inPeriod(null, { from: null, to: null })).toBe(false);
    expect(inPeriod("", { from: null, to: null })).toBe(false);
  });
  it("ignora hora se vier timestamp", () => {
    expect(inPeriod("2026-07-15T23:00:00Z", range)).toBe(true);
  });
});

describe("rótulos", () => {
  it("presetLabel devolve o texto PT-BR", () => {
    expect(presetLabel("thisMonth")).toBe("Este mês");
    expect(presetLabel("all")).toBe("Todo o período");
  });
  it("periodButtonLabel: preset usa nome; custom mostra o intervalo", () => {
    expect(periodButtonLabel({ preset: "thisMonth", from: "2026-07-01", to: "2026-07-31" })).toBe(
      "Este mês",
    );
    expect(periodButtonLabel({ preset: "custom", from: "2026-01-01", to: "2026-03-31" })).toBe(
      "01/01/2026 – 31/03/2026",
    );
    expect(periodButtonLabel({ preset: "custom", from: "2026-01-01", to: null })).toBe(
      "A partir de 01/01/2026",
    );
    expect(periodButtonLabel({ preset: "custom", from: null, to: "2026-03-31" })).toBe(
      "Até 31/03/2026",
    );
    expect(periodButtonLabel({ preset: "custom", from: null, to: null })).toBe("Personalizado");
  });
});
