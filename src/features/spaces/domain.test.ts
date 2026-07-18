import { describe, it, expect } from "vitest";
import {
  canManage,
  countByKey,
  countLabel,
  groupSpacesByKind,
  isOverdue,
  nextPosition,
  progressLabel,
  sortCommentsOldestFirst,
  sortPostsForBoard,
  sortTodos,
  spaceKindLabel,
  spaceKindSingular,
  todoProgress,
} from "./domain";
import type { Space } from "./types";

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
