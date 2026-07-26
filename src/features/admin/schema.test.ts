import { describe, it, expect } from "vitest";
import { isUuid, parseOrgStatus } from "./schema";

describe("schema — uuid da org", () => {
  it("aceita um uuid válido e rejeita lixo", () => {
    expect(isUuid("b04376ab-8ce1-4fe9-bf54-fa91df31264d")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("schema — status alvo", () => {
  it("só aceita active/suspended; o resto vira null (rejeita, não coage)", () => {
    expect(parseOrgStatus("active")).toBe("active");
    expect(parseOrgStatus("suspended")).toBe("suspended");
    expect(parseOrgStatus("deleted")).toBeNull();
    expect(parseOrgStatus("")).toBeNull();
  });
});
