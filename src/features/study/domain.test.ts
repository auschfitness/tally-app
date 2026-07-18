import { describe, it, expect } from "vitest";
import {
  filterSermons,
  sortSermonsByDate,
  SECTIONS,
  OPTIONAL_SECTIONS,
  STATUS_BAND,
  coverage,
  sermonIdsUsing,
  DEFAULT_SECTION,
  appendBlock,
  buildTranslationBlock,
  buildRelatedBlock,
  buildKeywordBlock,
  buildOriginalBlock,
  buildContextBlock,
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
