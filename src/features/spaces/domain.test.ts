import { describe, it, expect } from "vitest";
import {
  asVisibility,
  canManage,
  chatDayLabel,
  countByKey,
  countLabel,
  dedupeById,
  groupChatByDay,
  groupSpacesByKind,
  isOverdue,
  mergeChat,
  nextPosition,
  progressLabel,
  showAuthorLine,
  sortChatAsc,
  sortCommentsOldestFirst,
  sortPostsForBoard,
  sortTodos,
  spaceKindLabel,
  spaceKindSingular,
  spaceVisibilityLabel,
  todoProgress,
} from "./domain";
import type { ChatMessage, Space } from "./types";

function chat(p: Partial<ChatMessage>): ChatMessage {
  return {
    id: "m",
    senderId: "u1",
    senderName: "Ana",
    body: "oi",
    createdAt: "2026-07-19T12:00:00Z",
    ...p,
  };
}

function space(p: Partial<Space>): Space {
  return {
    id: "s",
    kind: "group",
    refId: "g1",
    name: "Espaço",
    description: "",
    archived: false,
    postCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...p,
  };
}

describe("domain — agrupar espaços por tipo", () => {
  it("agrupa na ordem Igreja · Ministérios · Grupos", () => {
    const groups = groupSpacesByKind([
      space({ id: "g", kind: "group" }),
      space({ id: "c", kind: "church", refId: null }),
      space({ id: "m", kind: "ministry" }),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["church", "ministry", "group"]);
    expect(groups.map((g) => g.label)).toEqual(["Igreja", "Ministérios", "Grupos"]);
  });

  it("omite seções sem espaços", () => {
    const groups = groupSpacesByKind([space({ kind: "group" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("group");
  });

  it("lista vazia vira nenhum grupo", () => {
    expect(groupSpacesByKind([])).toEqual([]);
  });
});

describe("domain — ordenar posts do quadro", () => {
  it("fixados primeiro, depois mais recentes", () => {
    const ordered = sortPostsForBoard([
      { id: "a", pinned: false, createdAt: "2026-01-01T00:00:00Z" },
      { id: "b", pinned: false, createdAt: "2026-03-01T00:00:00Z" },
      { id: "c", pinned: true, createdAt: "2026-02-01T00:00:00Z" },
    ]);
    expect(ordered.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("não muta a lista de entrada", () => {
    const input = [
      { id: "a", pinned: false, createdAt: "2026-01-01T00:00:00Z" },
      { id: "b", pinned: true, createdAt: "2026-01-02T00:00:00Z" },
    ];
    sortPostsForBoard(input);
    expect(input.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("domain — comentários mais antigos primeiro", () => {
  it("ordena ascendente por data", () => {
    const ordered = sortCommentsOldestFirst([
      { createdAt: "2026-03-01T00:00:00Z", id: "z" },
      { createdAt: "2026-01-01T00:00:00Z", id: "a" },
    ]);
    expect(ordered.map((c) => c.id)).toEqual(["a", "z"]);
  });
});

describe("domain — contadores", () => {
  it("countByKey conta ocorrências por chave", () => {
    expect(countByKey(["p1", "p1", "p2"])).toEqual({ p1: 2, p2: 1 });
    expect(countByKey([])).toEqual({});
  });
  it("countLabel usa singular/plural certo", () => {
    expect(countLabel(1, "post", "posts")).toBe("1 post");
    expect(countLabel(0, "post", "posts")).toBe("0 posts");
    expect(countLabel(3, "comentário", "comentários")).toBe("3 comentários");
  });
});

describe("domain — autorização (autor ou org.manage)", () => {
  it("o autor pode", () => {
    expect(canManage("u1", "u1", false)).toBe(true);
  });
  it("quem tem org.manage pode mesmo sem ser autor", () => {
    expect(canManage("u2", "u1", true)).toBe(true);
  });
  it("terceiro sem org.manage não pode", () => {
    expect(canManage("u2", "u1", false)).toBe(false);
  });
});

describe("domain — rótulos de tipo", () => {
  it("plural e singular", () => {
    expect(spaceKindLabel("ministry")).toBe("Ministérios");
    expect(spaceKindSingular("ministry")).toBe("Ministério");
    expect(spaceKindLabel("church")).toBe("Igreja");
    expect(spaceKindSingular("group")).toBe("Grupo");
  });
});

describe("domain — visibilidade do espaço", () => {
  it("asVisibility coage o texto do banco (default fechado)", () => {
    expect(asVisibility("members")).toBe("members");
    expect(asVisibility("leaders")).toBe("leaders");
    expect(asVisibility(null)).toBe("leaders");
    expect(asVisibility("qualquer_coisa")).toBe("leaders");
  });
  it("rótulos em PT-BR", () => {
    expect(spaceVisibilityLabel("leaders")).toBe("Só liderança");
    expect(spaceVisibilityLabel("members")).toBe("Todos os membros");
  });
});

describe("domain — tarefas: ordenação", () => {
  it("não-concluídos primeiro, concluídos ao fim; por position dentro do grupo", () => {
    const ordered = sortTodos([
      { id: "a", done: true, position: 0 },
      { id: "b", done: false, position: 2 },
      { id: "c", done: false, position: 1 },
      { id: "d", done: true, position: 5 },
    ]);
    expect(ordered.map((t) => t.id)).toEqual(["c", "b", "a", "d"]);
  });
  it("não muta a entrada", () => {
    const input = [
      { id: "a", done: true, position: 0 },
      { id: "b", done: false, position: 1 },
    ];
    sortTodos(input);
    expect(input.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("domain — tarefas: progresso", () => {
  it("todoProgress conta concluídas de total", () => {
    expect(todoProgress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3 });
    expect(todoProgress([])).toEqual({ done: 0, total: 0 });
  });
  it("progressLabel formata X de Y", () => {
    expect(progressLabel(2, 5)).toBe("2 de 5 concluídas");
    expect(progressLabel(0, 0)).toBe("0 de 0 concluídas");
  });
});

describe("domain — tarefas: vencido", () => {
  const TODAY = "2026-07-18";
  it("vencido quando prazo < hoje e não concluído", () => {
    expect(isOverdue("2026-07-17", false, TODAY)).toBe(true);
  });
  it("hoje não é vencido", () => {
    expect(isOverdue("2026-07-18", false, TODAY)).toBe(false);
  });
  it("futuro não é vencido", () => {
    expect(isOverdue("2026-07-20", false, TODAY)).toBe(false);
  });
  it("concluído nunca é vencido; sem prazo nunca é vencido", () => {
    expect(isOverdue("2026-01-01", true, TODAY)).toBe(false);
    expect(isOverdue(null, false, TODAY)).toBe(false);
  });
});

describe("domain — tarefas: próxima posição", () => {
  it("maior position + 1", () => {
    expect(nextPosition([{ position: 0 }, { position: 3 }, { position: 1 }])).toBe(4);
  });
  it("lista vazia começa em 0", () => {
    expect(nextPosition([])).toBe(0);
  });
});

describe("domain — chat: dedupe por id", () => {
  it("mantém a primeira ocorrência e a ordem", () => {
    const out = dedupeById([{ id: "a" }, { id: "b" }, { id: "a" }, { id: "c" }]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("domain — chat: ordenar por data", () => {
  it("crescente por createdAt, desempate por id", () => {
    const out = sortChatAsc([
      { id: "z", createdAt: "2026-07-19T12:00:00Z" },
      { id: "a", createdAt: "2026-07-19T12:00:00Z" },
      { id: "b", createdAt: "2026-07-19T11:00:00Z" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "a", "z"]);
  });
  it("não muta a entrada", () => {
    const input = [
      { id: "a", createdAt: "2026-07-19T12:00:00Z" },
      { id: "b", createdAt: "2026-07-19T11:00:00Z" },
    ];
    sortChatAsc(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("domain — chat: merge (tempo real / carregar antigas)", () => {
  it("junta, remove duplicata por id e reordena", () => {
    const existing = [chat({ id: "2", createdAt: "2026-07-19T12:00:00Z" })];
    const incoming = [
      chat({ id: "1", createdAt: "2026-07-19T11:00:00Z" }),
      chat({ id: "2", createdAt: "2026-07-19T12:00:00Z" }), // eco da própria mensagem
    ];
    const out = mergeChat(existing, incoming);
    expect(out.map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("domain — chat: agrupar por dia", () => {
  it("agrupa dias consecutivos preservando a ordem", () => {
    const groups = groupChatByDay([
      chat({ id: "1", createdAt: "2026-07-18T23:00:00Z" }),
      chat({ id: "2", createdAt: "2026-07-19T00:30:00Z" }),
      chat({ id: "3", createdAt: "2026-07-19T08:00:00Z" }),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-07-18", "2026-07-19"]);
    expect(groups[1]!.messages.map((m) => m.id)).toEqual(["2", "3"]);
  });
});

describe("domain — chat: rótulo do dia", () => {
  const TODAY = "2026-07-19";
  it("hoje / ontem / data", () => {
    expect(chatDayLabel("2026-07-19", TODAY)).toBe("Hoje");
    expect(chatDayLabel("2026-07-18", TODAY)).toBe("Ontem");
    expect(chatDayLabel("2026-07-10", TODAY)).toBe("10/07/2026");
  });
  it("atravessa a virada do mês para 'Ontem'", () => {
    expect(chatDayLabel("2026-06-30", "2026-07-01")).toBe("Ontem");
  });
});

describe("domain — chat: cabeçalho do autor", () => {
  const a1 = chat({ id: "1", senderId: "u1", createdAt: "2026-07-19T10:00:00Z" });
  const a2 = chat({ id: "2", senderId: "u1", createdAt: "2026-07-19T10:01:00Z" });
  const b1 = chat({ id: "3", senderId: "u2", createdAt: "2026-07-19T10:02:00Z" });
  const a3 = chat({ id: "4", senderId: "u1", createdAt: "2026-07-20T09:00:00Z" });
  it("mostra no início, ao trocar de autor e ao virar o dia", () => {
    expect(showAuthorLine(null, a1)).toBe(true); // início
    expect(showAuthorLine(a1, a2)).toBe(false); // mesmo autor, mesmo dia
    expect(showAuthorLine(a2, b1)).toBe(true); // trocou de autor
    expect(showAuthorLine(b1, a3)).toBe(true); // virou o dia (e trocou autor)
    expect(showAuthorLine(a2, a3)).toBe(true); // mesmo autor, outro dia
  });
});
