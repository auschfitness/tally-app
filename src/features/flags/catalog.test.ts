import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ALL_FLAGS,
  ROLLOUT_LABELS,
  ROLLOUT_ORDER,
  globalOn,
  isFlagKey,
  parseRollout,
  type FlagKey,
} from "./catalog";
import { flagOn } from "./gate";

describe("integridade do catálogo", () => {
  it("tem exatamente as 9 chaves, sem duplicata", () => {
    expect(ALL_FLAGS).toHaveLength(9);
    expect(new Set(ALL_FLAGS).size).toBe(9);
  });

  it("as chaves batem com as que as migrations semearam", () => {
    // Guarda contra a divergência clássica: alguém acrescenta flag no SQL e esquece o
    // catálogo (ou o contrário), e a flag simplesmente não existe para o app. Varre
    // TODA migration de feature_flags (m51 semeou o lote inicial; cada flag nova entra
    // numa migration própria) — senão o guarda só cobriria a primeira.
    const dir = fileURLToPath(new URL("../../../supabase/migrations/", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith("feature_flags.sql"));
    if (!files.length) throw new Error("nenhuma migration *feature_flags.sql encontrada");
    const sql = files.map((f) => readFileSync(dir + f, "utf8")).join("\n");
    const seeded = [...sql.matchAll(/^\s*\('([a-z0-9_.]+)',/gm)].map((m) => m[1]);
    expect(seeded.sort()).toEqual([...ALL_FLAGS].sort());
  });

  it("toda chave é reconhecida por isFlagKey, e só ela", () => {
    for (const k of ALL_FLAGS) expect(isFlagKey(k)).toBe(true);
    expect(isFlagKey("finance.v3")).toBe(false);
    expect(isFlagKey("")).toBe(false);
    expect(isFlagKey("ui.design_v2 ")).toBe(false);
  });

  it("chave é sempre 'modulo.assunto' em minúsculas", () => {
    for (const k of ALL_FLAGS) expect(k).toMatch(/^[a-z0-9_]+\.[a-z0-9_]+$/);
  });
});

describe("parseRollout", () => {
  it("aceita só os três valores do CHECK do banco", () => {
    for (const r of ROLLOUT_ORDER) expect(parseRollout(r)).toBe(r);
  });
  it("rejeita (não coage) valor fora da união", () => {
    expect(parseRollout("ON")).toBeNull();
    expect(parseRollout("")).toBeNull();
    expect(parseRollout("everyone")).toBeNull();
  });
  it("todo rollout tem rótulo humano", () => {
    for (const r of ROLLOUT_ORDER) expect(ROLLOUT_LABELS[r]).toBeTruthy();
  });
});

describe("globalOn (default global, sem override)", () => {
  it("só vale com rollout 'all' E enabled — a ordem 'off' → 'orgs' → 'all' é crescente", () => {
    expect(globalOn({ enabled: true, rollout: "all" })).toBe(true);
    expect(globalOn({ enabled: true, rollout: "orgs" })).toBe(false); // depende de override
    expect(globalOn({ enabled: true, rollout: "off" })).toBe(false);
    expect(globalOn({ enabled: false, rollout: "all" })).toBe(false);
  });
});

describe("flagOn", () => {
  const ctx = (flags: FlagKey[]) => ({ flags });

  it("liga só a flag presente na lista resolvida da org", () => {
    expect(flagOn(ctx(["finance.v2"]), "finance.v2")).toBe(true);
    expect(flagOn(ctx(["finance.v2"]), "finance.ofx_import")).toBe(false);
  });

  it("fecha por padrão: org sem flag nenhuma não vê nada", () => {
    for (const k of ALL_FLAGS) expect(flagOn(ctx([]), k)).toBe(false);
  });

  it("não confunde prefixo de módulo", () => {
    expect(flagOn(ctx(["study.bible_v2"]), "study.interlinear")).toBe(false);
  });

  it("a precedência (override por org > rollout global) já vem resolvida do banco", () => {
    // `org_flags` devolve a lista final; o gate do app é pertinência pura — se um dia a
    // precedência mudar, muda no SQL, num lugar só.
    expect(flagOn(ctx([...ALL_FLAGS]), "ui.design_v2")).toBe(true);
  });
});
