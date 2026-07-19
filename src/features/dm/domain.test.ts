import { describe, it, expect } from "vitest";
import {
  canonicalPair,
  countUnread,
  dayLabel,
  groupByDay,
  hasReceivedUnread,
  isMine,
  isoMinusOneDay,
  isUnread,
  messagePreview,
  otherParticipant,
  sortThreads,
} from "./domain";
import type { DmMessage } from "./types";

function msg(p: Partial<DmMessage>): DmMessage {
  return {
    id: "m",
    senderId: "u1",
    body: "oi",
    readAt: null,
    createdAt: "2026-07-19T12:00:00Z",
    ...p,
  };
}

describe("domain — par canônico", () => {
  it("o menor id vira user_a, independente da ordem dos argumentos", () => {
    expect(canonicalPair("aaa", "bbb")).toEqual({ userA: "aaa", userB: "bbb" });
    expect(canonicalPair("bbb", "aaa")).toEqual({ userA: "aaa", userB: "bbb" });
  });
  it("a mesma dupla sempre mapeia para o mesmo par (idempotente)", () => {
    const a = canonicalPair("z", "a");
    const b = canonicalPair("a", "z");
    expect(a).toEqual(b);
  });
});

describe("domain — outro participante", () => {
  it("devolve o lado que não sou eu", () => {
    expect(otherParticipant("a", "b", "a")).toBe("b");
    expect(otherParticipant("a", "b", "b")).toBe("a");
  });
});

describe("domain — mensagem minha / não-lida", () => {
  it("isMine compara o remetente", () => {
    expect(isMine("u1", "u1")).toBe(true);
    expect(isMine("u1", "u2")).toBe(false);
  });
  it("não-lida = recebida (outro remetente) e sem read_at", () => {
    expect(isUnread({ senderId: "u2", readAt: null }, "u1")).toBe(true);
    expect(isUnread({ senderId: "u2", readAt: "2026-07-19T12:00:00Z" }, "u1")).toBe(false);
    expect(isUnread({ senderId: "u1", readAt: null }, "u1")).toBe(false); // a minha nunca conta
  });
  it("countUnread e hasReceivedUnread contam só as recebidas sem leitura", () => {
    const messages = [
      msg({ senderId: "u2", readAt: null }),
      msg({ senderId: "u2", readAt: "2026-07-19T13:00:00Z" }),
      msg({ senderId: "u1", readAt: null }),
      msg({ senderId: "u2", readAt: null }),
    ];
    expect(countUnread(messages, "u1")).toBe(2);
    expect(hasReceivedUnread(messages, "u1")).toBe(true);
    expect(hasReceivedUnread([msg({ senderId: "u1", readAt: null })], "u1")).toBe(false);
  });
});

describe("domain — prévia da última mensagem", () => {
  it("colapsa espaços e quebras", () => {
    expect(messagePreview("oi\n  tudo   bem")).toBe("oi tudo bem");
  });
  it("corta com reticências quando passa do limite", () => {
    expect(messagePreview("abcdefghij", 5)).toBe("abcd…");
  });
  it("mantém curto sem tocar", () => {
    expect(messagePreview("curto", 80)).toBe("curto");
  });
  it("corpo vazio/nulo vira string vazia", () => {
    expect(messagePreview("")).toBe("");
    expect(messagePreview(null)).toBe("");
    expect(messagePreview(undefined)).toBe("");
  });
});

describe("domain — ordenar conversas por recência", () => {
  it("mais recente primeiro; sem última mensagem cai para o fim", () => {
    const sorted = sortThreads([
      { id: "a", lastMessageAt: "2026-07-10T00:00:00Z" },
      { id: "b", lastMessageAt: null },
      { id: "c", lastMessageAt: "2026-07-19T00:00:00Z" },
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
  it("não muta a entrada", () => {
    const input = [
      { id: "a", lastMessageAt: "2026-07-10T00:00:00Z" },
      { id: "b", lastMessageAt: "2026-07-19T00:00:00Z" },
    ];
    sortThreads(input);
    expect(input.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("domain — agrupar mensagens por dia", () => {
  it("agrupa dias consecutivos e preserva a ordem", () => {
    const groups = groupByDay([
      msg({ id: "1", createdAt: "2026-07-18T09:00:00Z" }),
      msg({ id: "2", createdAt: "2026-07-18T22:00:00Z" }),
      msg({ id: "3", createdAt: "2026-07-19T08:00:00Z" }),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-07-18", "2026-07-19"]);
    expect(groups[0]!.messages.map((m) => m.id)).toEqual(["1", "2"]);
    expect(groups[1]!.messages.map((m) => m.id)).toEqual(["3"]);
  });
  it("lista vazia vira nenhum grupo", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("domain — rótulo do dia", () => {
  const TODAY = "2026-07-19";
  it("hoje e ontem", () => {
    expect(dayLabel("2026-07-19", TODAY)).toBe("Hoje");
    expect(dayLabel("2026-07-18", TODAY)).toBe("Ontem");
  });
  it("outros dias em dd/mm/aaaa", () => {
    expect(dayLabel("2026-07-10", TODAY)).toBe("10/07/2026");
  });
  it("isoMinusOneDay atravessa a virada do mês", () => {
    expect(isoMinusOneDay("2026-08-01")).toBe("2026-07-31");
    expect(isoMinusOneDay("2026-01-01")).toBe("2025-12-31");
  });
});
