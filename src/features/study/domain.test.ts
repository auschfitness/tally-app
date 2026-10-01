import { describe, it, expect } from "vitest";
import {
  filterSermons,
  trashDaysLeft,
  trashCutoff,
  sortSermonsByDate,
  SECTIONS,
  OPTIONAL_SECTIONS,
  STATUS_BAND,
  STATUS_LBL,
  CHOOSABLE_STATUSES,
  shortDate,
  seriesPeriod,
  editedAgo,
  libraryGroups,
  coverage,
  sermonIdsUsing,
  DEFAULT_SECTION,
  appendBlock,
  buildTranslationBlock,
  buildRelatedBlock,
  buildKeywordBlock,
  buildOriginalBlock,
  buildContextBlock,
  inProgressSermon,
  isBodyEmpty,
  missingParts,
  searchSermons,
} from "./domain";
import type { Scripture, Sermon } from "./types";

function sermon(o: Partial<Sermon>): Sermon {
  return {
    id: o.id ?? "s",
    title: o.title ?? "Sermão",
    subtitle: o.subtitle ?? "",
    description: o.description ?? "",
    campus: o.campus ?? "Sede",
    sermon_date: o.sermon_date ?? "",
    series_id: o.series_id ?? null,
    service_id: o.service_id ?? null,
    status: o.status ?? "draft",
    visibility: o.visibility ?? "church",
    main_passage: o.main_passage ?? "",
    big_idea: o.big_idea ?? "",
    content: o.content ?? {},
    updated_at: o.updated_at ?? "",
  };
}

describe("SECTIONS (glossário PT-BR fixado)", () => {
  it("tem as 5 seções com os rótulos corretos", () => {
    expect(SECTIONS.map((s) => s.label)).toEqual(["Esboço", "Notas", "Ilustrações", "Aplicação", "Resposta de oração"]);
  });
  it("opcionais = tudo menos o corpo 'notes'", () => {
    expect(OPTIONAL_SECTIONS.map((s) => s.key)).toEqual(["outline", "illustrations", "application", "prayer_response"]);
  });
});

describe("filterSermons", () => {
  const list = [
    sermon({ id: "a", status: "draft", campus: "Sede", series_id: "x" }),
    sermon({ id: "b", status: "ready", campus: "Sede", series_id: null }),
    sermon({ id: "c", status: "ready", campus: "Zona Sul", series_id: "y" }),
  ];
  it("filtra por status e campus", () => {
    expect(filterSermons(list, { status: "ready", campus: "Sede", series: null }).map((s) => s.id)).toEqual(["b"]);
  });
  it("série '__none__' pega sem série", () => {
    expect(filterSermons(list, { status: null, campus: null, series: "__none__" }).map((s) => s.id)).toEqual(["b"]);
  });
  it("série por id", () => {
    expect(filterSermons(list, { status: null, campus: null, series: "x" }).map((s) => s.id)).toEqual(["a"]);
  });
  it("sem filtros devolve tudo", () => {
    expect(filterSermons(list, { status: null, campus: null, series: null })).toHaveLength(3);
  });
});

describe("sortSermonsByDate", () => {
  it("desc por data, sem data ao fim, sem mutar", () => {
    const list = [sermon({ id: "a", sermon_date: "2026-01-10" }), sermon({ id: "b", sermon_date: "" }), sermon({ id: "c", sermon_date: "2026-05-20" })];
    expect(sortSermonsByDate(list).map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("asc inverte a ordem das datas", () => {
    const list = [sermon({ id: "a", sermon_date: "2026-01-10" }), sermon({ id: "c", sermon_date: "2026-05-20" })];
    expect(sortSermonsByDate(list, "asc").map((s) => s.id)).toEqual(["a", "c"]);
  });
});

describe("STATUS_BAND", () => {
  it("pregado/pronto = healthy; arquivado = risk", () => {
    expect(STATUS_BAND.preached).toBe("healthy");
    expect(STATUS_BAND.ready).toBe("healthy");
    expect(STATUS_BAND.archived).toBe("risk");
    expect(STATUS_BAND.draft).toBe("attention");
  });
});

describe("coverage / sermonIdsUsing (Mapa de Escrituras)", () => {
  const scr = (o: Partial<Scripture>): Scripture => ({
    id: o.id ?? Math.random().toString(36).slice(2),
    sermon_id: o.sermon_id ?? "s1",
    book: o.book ?? "JHN",
    chapter: o.chapter ?? 10,
    verse_start: o.verse_start ?? null,
    verse_end: o.verse_end ?? null,
    reference: o.reference ?? "João 10",
  });
  it("conta sermões DISTINTOS por livro (não dupla contagem)", () => {
    const list = [
      scr({ sermon_id: "s1", book: "JHN" }),
      scr({ sermon_id: "s1", book: "JHN", chapter: 3 }), // mesmo sermão, mesmo livro → 1
      scr({ sermon_id: "s2", book: "JHN" }),
      scr({ sermon_id: "s1", book: "ROM" }),
    ];
    const cov = coverage(list);
    expect(cov.count.JHN).toBe(2); // s1, s2
    expect(cov.count.ROM).toBe(1);
    expect(cov.max).toBe(2);
  });
  it("sermonIdsUsing exclui o sermão atual", () => {
    const list = [scr({ sermon_id: "s1", book: "JHN", chapter: 10 }), scr({ sermon_id: "s2", book: "JHN", chapter: 10 })];
    expect(sermonIdsUsing(list, "JHN", 10, "s1")).toEqual(["s2"]);
  });
});

describe("Fase 4 — blocos das lentes → sermão", () => {
  it("DEFAULT_SECTION é 'notes'", () => {
    expect(DEFAULT_SECTION).toBe("notes");
  });

  describe("appendBlock", () => {
    it("em seção vazia devolve só o bloco (trim)", () => {
      expect(appendBlock("", "  olá  ")).toBe("olá");
    });
    it("anexa preservando o conteúdo, com 2 quebras de linha", () => {
      expect(appendBlock("linha 1", "linha 2")).toBe("linha 1\n\nlinha 2");
    });
    it("não deixa quebras extras no fim do existente", () => {
      expect(appendBlock("linha 1\n\n", "linha 2")).toBe("linha 1\n\nlinha 2");
    });
    it("bloco vazio não altera o existente", () => {
      expect(appendBlock("linha 1", "   ")).toBe("linha 1");
    });
  });

  it("buildTranslationBlock: referência (SIGLA) + versículos numerados", () => {
    const block = buildTranslationBlock("João 3:16", "ARC", [
      { n: 16, text: "Porque Deus amou o mundo…" },
    ]);
    expect(block).toBe("João 3:16 (ARC)\n16 Porque Deus amou o mundo…");
  });

  it("buildRelatedBlock: lista de textos relacionados", () => {
    const block = buildRelatedBlock("João 10:1-18", [{ label: "Ez 34:11" }, { label: "Sl 23:1" }]);
    expect(block).toBe("Textos relacionados a João 10:1-18:\n- Ez 34:11\n- Sl 23:1");
  });
  it("buildRelatedBlock sem relacionados: só o cabeçalho", () => {
    expect(buildRelatedBlock("João 10", [])).toBe("Textos relacionados a João 10:");
  });

  it("buildKeywordBlock: lema, Strong, significado e frequência", () => {
    expect(buildKeywordBlock({ lemma: "ἀγάπη", strong: "G26", meaning: "amor", occurrences: 116 })).toBe(
      "ἀγάπη (G26) — amor · aparece 116× na Bíblia",
    );
  });
  it("buildKeywordBlock degrada sem significado nem frequência", () => {
    expect(buildKeywordBlock({ lemma: "λόγος", strong: "G3056", meaning: "", occurrences: null })).toBe("λόγος (G3056)");
  });

  it("buildOriginalBlock: surface, Strong, lema e morfologia", () => {
    expect(buildOriginalBlock("ἠγάπησεν", "G25", "ἀγαπάω", "Verbo · Aoristo · Ativa · Indicativo · 3ª pessoa singular")).toBe(
      "ἠγάπησεν (G25) — ἀγαπάω; Verbo · Aoristo · Ativa · Indicativo · 3ª pessoa singular",
    );
  });
  it("buildOriginalBlock sem lema/morfologia: só surface + Strong", () => {
    expect(buildOriginalBlock("λόγος", "G3056", null, "")).toBe("λόγος (G3056)");
  });

  it("buildContextBlock: título — tema + resumo", () => {
    expect(buildContextBlock("Evangelho de João", "O Verbo encarnado", "João apresenta Jesus como…")).toBe(
      "Evangelho de João — O Verbo encarnado\nJoão apresenta Jesus como…",
    );
  });
  it("buildContextBlock sem tema nem resumo: só o título", () => {
    expect(buildContextBlock("Evangelho de João", null, null)).toBe("Evangelho de João");
  });
});

describe("biblioteca v2 — 'Continuando' (spec 06)", () => {
  const preparing = sermon({ id: "a", status: "preparing", updated_at: "2026-09-01T10:00:00Z" });
  const draft = sermon({ id: "b", status: "draft", updated_at: "2026-09-10T10:00:00Z" });
  const preached = sermon({ id: "c", status: "preached", updated_at: "2026-09-14T10:00:00Z" });
  const archived = sermon({ id: "d", status: "archived", updated_at: "2026-09-15T10:00:00Z" });

  it("pega o mais recentemente salvo entre os EM ABERTO", () => {
    expect(inProgressSermon([preparing, draft])?.id).toBe("b");
  });

  it("abrir um sermão antigo só pra reler não o promove a 'Continuando'", () => {
    // preached/archived são os mais recentes por updated_at e mesmo assim perdem —
    // senão o bloco mentiria no dia em que o pastor reabre um sermão já pregado.
    expect(inProgressSermon([preparing, draft, preached, archived])?.id).toBe("b");
  });

  it("sem nenhum em aberto → null (o bloco some, não vira estado vazio)", () => {
    expect(inProgressSermon([preached, archived])).toBeNull();
    expect(inProgressSermon([])).toBeNull();
  });
});

describe("biblioteca v2 — o que falta no sermão", () => {
  it("sai de dado real, e a lista é vazia quando não falta nada", () => {
    const cheio = sermon({ main_passage: "João 10:1-18", big_idea: "O Bom Pastor dá a vida", content: { notes: "texto" } });
    expect(missingParts(cheio)).toEqual([]);
  });

  it("aponta passagem, ideia central e corpo em branco", () => {
    expect(missingParts(sermon({}))).toEqual(["falta a passagem", "falta a ideia central", "o corpo ainda está em branco"]);
  });

  it("corpo escrito em QUALQUER seção conta como corpo (não só em 'notes')", () => {
    expect(isBodyEmpty(sermon({ content: { outline: "1. Introdução" } }))).toBe(false);
    expect(isBodyEmpty(sermon({ content: { prayer_response: "Ore por…" } }))).toBe(false);
    expect(isBodyEmpty(sermon({ content: { notes: "   " } }))).toBe(true);
    expect(isBodyEmpty(sermon({ content: { track_id: "x" } }))).toBe(true); // não é seção
  });
});

describe("biblioteca v2 — busca", () => {
  const titles = new Map([["se1", "O Bom Pastor"]]);
  const a = sermon({ id: "a", title: "A porta das ovelhas", main_passage: "João 10:1-18", series_id: "se1" });
  const b = sermon({ id: "b", title: "Graça sobre graça", big_idea: "A graça é suficiente" });

  it("encontra por título, passagem, ideia central e NOME DA SÉRIE", () => {
    expect(searchSermons([a, b], "ovelhas", titles).map((s) => s.id)).toEqual(["a"]);
    expect(searchSermons([a, b], "joão 10", titles).map((s) => s.id)).toEqual(["a"]);
    expect(searchSermons([a, b], "suficiente", titles).map((s) => s.id)).toEqual(["b"]);
    expect(searchSermons([a, b], "bom pastor", titles).map((s) => s.id)).toEqual(["a"]);
  });

  it("ignora acento e caixa (ninguém digita 'Joao' com til no celular)", () => {
    expect(searchSermons([a, b], "JOAO", titles).map((s) => s.id)).toEqual(["a"]);
    expect(searchSermons([a, b], "graca", titles).map((s) => s.id)).toEqual(["b"]);
  });

  it("consulta vazia devolve a lista inteira", () => {
    expect(searchSermons([a, b], "   ", titles)).toHaveLength(2);
  });
});

describe("lixeira", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  it("excluído agora tem 30 dias", () => {
    expect(trashDaysLeft("2026-10-01T11:00:00Z", now)).toBe(30);
  });
  it("excluído há 29,5 dias ainda tem 1 dia; há 31 dias, 0", () => {
    expect(trashDaysLeft("2026-09-02T00:00:00Z", now)).toBe(1);
    expect(trashDaysLeft("2026-08-31T00:00:00Z", now)).toBe(0);
  });
  it("corte é 30 dias antes de agora", () => {
    expect(trashCutoff(now)).toBe("2026-09-01T12:00:00.000Z");
  });
});

describe("status: 3 escolhas (spec 10)", () => {
  it("só Rascunho/Pronto/Pregado são escolhíveis; preparing aparece como Rascunho", () => {
    expect(CHOOSABLE_STATUSES.map((k) => STATUS_LBL[k])).toEqual(["Rascunho", "Pronto", "Pregado"]);
    expect(STATUS_LBL.preparing).toBe("Rascunho");
    expect(STATUS_LBL.archived).toBe("Arquivado");
    expect(CHOOSABLE_STATUSES).not.toContain("archived");
  });
});

describe("datas da biblioteca", () => {
  it("shortDate: dia + mês abreviado, sem zero à esquerda", () => {
    expect(shortDate("2026-09-04")).toBe("4 set");
    expect(shortDate("")).toBe("");
  });
  it("seriesPeriod cobre os casos de ano e de fim ausente", () => {
    expect(seriesPeriod("2026-08-02", "2026-10-20")).toBe("ago a out 2026");
    expect(seriesPeriod("2025-11-02", "2026-06-20")).toBe("nov 2025 a jun 2026");
    expect(seriesPeriod("2026-08-02", "2026-08-30")).toBe("ago 2026");
    expect(seriesPeriod("2026-08-02", "")).toBe("desde ago 2026");
    expect(seriesPeriod("", "2026-08-30")).toBe("");
  });
  it("editedAgo", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(editedAgo("2026-10-01T10:00:00Z", now)).toBe("editado há 2 h");
    expect(editedAgo("2026-09-30T10:00:00Z", now)).toBe("editado ontem");
    expect(editedAgo("2026-09-20T10:00:00Z", now)).toBe("editado há 11 dias");
    expect(editedAgo("2026-07-14T10:00:00Z", now)).toBe("editado em 14 jul");
  });
});

describe("libraryGroups (Por data)", () => {
  const list = [
    sermon({ id: "a", status: "draft", updated_at: "2026-09-01T00:00:00Z" }),
    sermon({ id: "b", status: "ready", updated_at: "2026-09-10T00:00:00Z" }),
    sermon({ id: "c", status: "preached", sermon_date: "2025-03-02" }),
    sermon({ id: "d", status: "preached", sermon_date: "2026-05-02" }),
    sermon({ id: "e", status: "preached", sermon_date: "" }),
    sermon({ id: "f", status: "archived" }),
  ];
  it("separa em aberto (sem o destaque), pregados por ano e arquivados", () => {
    const g = libraryGroups(list, "b");
    expect(g.open.map((s) => s.id)).toEqual(["a"]);
    expect(g.preached.map((y) => [y.year, y.items.map((s) => s.id)])).toEqual([["2026", ["d"]], ["2025", ["c"]], ["", ["e"]]]);
    expect(g.archived.map((s) => s.id)).toEqual(["f"]);
  });
});
