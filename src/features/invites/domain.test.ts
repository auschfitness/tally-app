import { describe, it, expect } from "vitest";
import {
  canInviteStick,
  effectiveStatus,
  inviteStatusLabel,
  inviteUrl,
  isExpired,
  partitionInvites,
  stickAccountLabel,
  stickAccountState,
} from "./domain";

const NOW = "2026-07-19T12:00:00Z";

describe("domain — expiração", () => {
  it("expirado quando o prazo é antes de agora", () => {
    expect(isExpired("2026-07-18T00:00:00Z", NOW)).toBe(true);
    expect(isExpired("2026-07-20T00:00:00Z", NOW)).toBe(false);
  });
});

describe("domain — status efetivo", () => {
  it("pending vencido vira expired", () => {
    expect(effectiveStatus("pending", "2026-07-18T00:00:00Z", NOW)).toBe("expired");
  });
  it("pending dentro do prazo continua pending", () => {
    expect(effectiveStatus("pending", "2026-08-18T00:00:00Z", NOW)).toBe("pending");
  });
  it("accepted/revoked não são afetados pelo prazo", () => {
    expect(effectiveStatus("accepted", "2026-01-01T00:00:00Z", NOW)).toBe("accepted");
    expect(effectiveStatus("revoked", "2026-01-01T00:00:00Z", NOW)).toBe("revoked");
  });
  it("status desconhecido cai para pending (e respeita o prazo)", () => {
    expect(effectiveStatus("weird", "2026-08-01T00:00:00Z", NOW)).toBe("pending");
    expect(effectiveStatus("weird", "2026-07-01T00:00:00Z", NOW)).toBe("expired");
  });
  it("rótulos em PT-BR", () => {
    expect(inviteStatusLabel("pending")).toBe("Convite pendente");
    expect(inviteStatusLabel("expired")).toBe("Expirado");
    expect(inviteStatusLabel("accepted")).toBe("Aceito");
    expect(inviteStatusLabel("revoked")).toBe("Revogado");
  });
});

describe("domain — estado de acesso da ficha", () => {
  it("com user_id = tem app (mesmo que haja convite pendente)", () => {
    expect(stickAccountState("u1", true)).toBe("active");
    expect(stickAccountState("u1", false)).toBe("active");
  });
  it("sem user_id mas com convite pendente = pending", () => {
    expect(stickAccountState(null, true)).toBe("pending");
  });
  it("sem nada = none", () => {
    expect(stickAccountState(null, false)).toBe("none");
  });
  it("rótulos", () => {
    expect(stickAccountLabel("active")).toBe("Tem acesso ao app");
    expect(stickAccountLabel("pending")).toBe("Convite pendente");
    expect(stickAccountLabel("none")).toBe("Sem acesso");
  });
});

describe("domain — pode convidar", () => {
  it("precisa de e-mail e não ter conta", () => {
    expect(canInviteStick("a@b.com", null)).toBe(true);
    expect(canInviteStick("a@b.com", "u1")).toBe(false); // já tem conta
    expect(canInviteStick(null, null)).toBe(false); // sem e-mail
    expect(canInviteStick("   ", null)).toBe(false); // e-mail em branco
  });
});

describe("domain — link do convite", () => {
  it("monta origin + /convite/token", () => {
    expect(inviteUrl("https://app.tally.com", "abc123")).toBe("https://app.tally.com/convite/abc123");
  });
  it("não duplica a barra final do origin", () => {
    expect(inviteUrl("https://app.tally.com/", "abc123")).toBe("https://app.tally.com/convite/abc123");
  });
});

describe("domain — partição da lista", () => {
  it("separa por status efetivo e preserva a ordem", () => {
    const inv = (id: string, status: "pending" | "accepted" | "revoked" | "expired") => ({ id, status });
    const groups = partitionInvites([
      inv("1", "pending"),
      inv("2", "accepted"),
      inv("3", "expired"),
      inv("4", "pending"),
      inv("5", "revoked"),
    ]);
    expect(groups.pending.map((i) => i.id)).toEqual(["1", "4"]);
    expect(groups.accepted.map((i) => i.id)).toEqual(["2"]);
    expect(groups.expired.map((i) => i.id)).toEqual(["3"]);
    expect(groups.revoked.map((i) => i.id)).toEqual(["5"]);
  });
});
