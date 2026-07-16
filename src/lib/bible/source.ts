// Fonte do texto bíblico (Study · passagens) — PLUGÁVEL, mantida como no legado.
// O texto NÃO fica no nosso banco; vem sob demanda da Free Use Bible API (helloao):
// grátis, sem chave, uso comercial liberado. Client-side (fetch a host externo).
// Interlinear grego/hebraico segue ADIADO. Portado de bible-source.js.
//
// Endpoints: /api/available_translations.json · /api/{tr}/{book}/{chapter}.json
"use client";

const BASE = "https://bible.helloao.org/api";

export interface Translation {
  id: string;
  language: string;
  name: string;
  englishName: string;
  shortName: string;
}
export interface PassageVerse {
  n: number;
  text: string;
}
export type PassageResult =
  | { ok: true; translationId: string; translationName: string; verses: PassageVerse[]; text: string }
  | { ok: false; error: string; translationId?: string; translationName?: string };

interface RawVerse {
  type?: string;
  number: number;
  content?: (string | { text?: string })[];
}

let _translations: Promise<Translation[]> | null = null;
const _chapterCache: Record<string, Promise<unknown>> = {};

function versesFrom(data: unknown): RawVerse[] {
  const d = data as { chapter?: { content?: unknown }; content?: unknown } | null;
  const arr = (d && d.chapter && d.chapter.content) || (d && d.content) || [];
  if (!Array.isArray(arr)) return [];
  return (arr as RawVerse[]).filter((x) => x && x.type === "verse");
}
function verseText(v: RawVerse): string {
  const parts = (v.content || []).map((seg) => {
    if (typeof seg === "string") return seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function listTranslations(): Promise<Translation[]> {
  if (_translations) return _translations;
  _translations = fetch(BASE + "/available_translations.json")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data: unknown) => {
      const d = data as { translations?: unknown[]; data?: unknown[] };
      const arr = (d && (d.translations || d.data)) || (Array.isArray(data) ? (data as unknown[]) : []);
      return (arr as Record<string, string>[]).map((t) => ({
        id: t.id!,
        language: t.language || "",
        name: t.name || t.englishName || t.id!,
        englishName: t.englishName || t.name || t.id!,
        shortName: t.shortName || t.id!,
      }));
    })
    .catch((e) => {
      _translations = null;
      throw e;
    });
  return _translations;
}

// Tradução padrão: prefere Português; senão BSB (domínio público); senão a primeira.
export function defaultTranslation(): Promise<Translation | null> {
  return listTranslations()
    .then((list) => {
      if (!list || !list.length) return null;
      const pt = list.filter((t) => (t.language || "").toLowerCase().indexOf("por") === 0);
      if (pt.length) return pt[0]!;
      const bsb = list.filter((t) => t.id === "BSB");
      if (bsb.length) return bsb[0]!;
      return list[0]!;
    })
    .catch(() => null);
}

// Busca o texto de uma passagem. `ref` = {book(code), chapter, verse_start, verse_end}.
export function fetchPassage(
  ref: { book: string; chapter: number; verse_start: number | null; verse_end: number | null },
  translationId?: string,
): Promise<PassageResult> {
  if (!ref || !ref.book || !ref.chapter) return Promise.resolve({ ok: false, error: "Referência inválida." });
  const start = translationId ? Promise.resolve(translationId) : defaultTranslation().then((d) => d && d.id);
  const nameFor = listTranslations()
    .then((list) => (id: string) => {
      const m = (list || []).find((x) => x.id === id);
      return m ? m.name + (m.shortName ? " (" + m.shortName + ")" : "") : id;
    })
    .catch(() => (id: string) => id);
  return start
    .then((trId) => {
      if (!trId) return { ok: false, error: "Nenhuma tradução disponível agora." } as PassageResult;
      const key = trId + "/" + ref.book + "/" + ref.chapter;
      if (!_chapterCache[key]) {
        _chapterCache[key] = fetch(BASE + "/" + trId + "/" + ref.book + "/" + ref.chapter + ".json")
          .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
          })
          .catch((e) => {
            delete _chapterCache[key];
            throw e;
          });
      }
      return Promise.all([_chapterCache[key], nameFor]).then(([data, nf]) => {
        const trName = nf(trId);
        const all = versesFrom(data);
        const vs = ref.verse_start;
        const ve = ref.verse_end || ref.verse_start;
        const picked = all
          .filter((v) => (!vs ? true : v.number >= vs && v.number <= (ve as number)))
          .map((v) => ({ n: v.number, text: verseText(v) }));
        if (!picked.length) return { ok: false, error: "Passagem não encontrada nesta tradução.", translationId: trId, translationName: trName } as PassageResult;
        return { ok: true, translationId: trId, translationName: trName, verses: picked, text: picked.map((p) => p.text).join(" ") } as PassageResult;
      });
    })
    .catch(() => ({ ok: false, error: "Não foi possível carregar a versão agora." }) as PassageResult);
}
