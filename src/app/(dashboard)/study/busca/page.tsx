import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/auth/session";
import { BOOKS, bookName } from "@/lib/bible/books";
import { osisToUsfm, usfmToOsis } from "@/lib/bible/osis";
import { curlyQuotes } from "@/features/study/reader";
import { highlight, searchTerms } from "@/features/study/search";
import styles from "@/features/study/search.module.css";

// Busca por palavra na Bíblia (sem IA): o banco acha e ordena (Gênesis -> Apocalipse);
// aqui só limpamos o texto como a leitura faz e marcamos as palavras. Formulário GET
// nativo: funciona sem JavaScript e o endereço guarda a busca.
export const metadata: Metadata = { title: "Buscar na Bíblia" };

const PAGE = 50;
type Scope = "tudo" | "at" | "nt";
const SCOPES: [Scope, string][] = [["tudo", "Toda a Bíblia"], ["at", "Antigo"], ["nt", "Novo"]];
const ordered = [...BOOKS].sort((a, b) => a.order - b.order);
const osisOf = (codes: typeof BOOKS) => codes.map((b) => usfmToOsis(b.code)).filter((x): x is string => !!x);
const SCOPE_BOOKS: Record<Scope, string[] | null> = {
  tudo: null,
  at: osisOf(ordered.filter((b) => b.order <= 39)),
  nt: osisOf(ordered.filter((b) => b.order > 39)),
};
const EXAMPLES = ["graça", '"pão da vida"', "perdão", "pastor ovelhas"];

export default async function BibleSearchPage({ searchParams }: { searchParams: Promise<{ q?: string; t?: string; p?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const scope: Scope = sp.t === "at" || sp.t === "nt" ? sp.t : "tudo";
  const page = Math.max(1, Number(sp.p) || 1);
  const { supabase } = await requireOrg();

  const href = (over: { t?: Scope; p?: number }) => {
    const u = new URLSearchParams({ q });
    const t = over.t ?? scope;
    if (t !== "tudo") u.set("t", t);
    const p = over.p ?? 1;
    if (p > 1) u.set("p", String(p));
    return `/study/busca?${u}`;
  };

  let rows: { usfm: string; chapter: number; verse: number; text: string }[] = [];
  let total = 0;
  let failed = false;
  if (q) {
    const { data, error } = await supabase.rpc("search_bible", { q, p_books: SCOPE_BOOKS[scope], lim: PAGE, off: (page - 1) * PAGE });
    failed = !!error;
    total = data?.[0]?.total ?? 0;
    rows = (data ?? []).flatMap((r) => {
      const usfm = osisToUsfm(r.book);
      if (!usfm) return [];
      const spans = (r.spans as [string, string | null][]).map(([text, strong]) => ({ text, strong }));
      return [{ usfm, chapter: r.chapter, verse: r.verse, text: curlyQuotes(spans).map((s) => s.text).join("").trim() }];
    });
  }
  const terms = searchTerms(q);
  const groups: { usfm: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const g = groups[groups.length - 1];
    if (g && g.usfm === r.usfm) g.items.push(r);
    else groups.push({ usfm: r.usfm, items: [r] });
  }
  const last = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className={styles.wrap}>
      <h1 className="page">Buscar na Bíblia</h1>
      <form className={styles.form} action="/study/busca" role="search">
        <input className={styles.input} type="search" name="q" defaultValue={q} placeholder="Palavra ou frase entre aspas" aria-label="Buscar na Bíblia" autoFocus={!q} />
        {scope !== "tudo" ? <input type="hidden" name="t" value={scope} /> : null}
        <button type="submit" className={styles.go}>Buscar</button>
      </form>

      {q ? (
        <nav className={styles.chips} aria-label="Testamento">
          {SCOPES.map(([s, label]) => (
            <Link key={s} href={href({ t: s })} className={styles.chip} aria-current={s === scope ? "true" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      ) : (
        <div className={styles.hint}>
          <p>Busque uma palavra em toda a Bíblia. Acento e plural não atrapalham: “graca” acha “graça” e “graças”. Use aspas para a frase exata.</p>
          <div className={styles.chips}>
            {EXAMPLES.map((e) => (
              <Link key={e} href={`/study/busca?q=${encodeURIComponent(e)}`} className={styles.chip}>{e}</Link>
            ))}
          </div>
        </div>
      )}

      {q && failed ? <p className={styles.count}>Não consegui buscar agora. Tente de novo em instantes.</p> : null}
      {q && !failed ? (
        <p className={styles.count} data-testid="search-count">
          {total === 0 ? `Nada encontrado para “${q}”.` : `${total.toLocaleString("pt-BR")} ${total === 1 ? "versículo" : "versículos"}`}
          {total > PAGE ? ` · página ${page} de ${last}` : ""}
        </p>
      ) : null}

      {groups.map((g) => (
        <section key={g.usfm + g.items[0]!.chapter + "-" + g.items[0]!.verse}>
          <h2 className={styles.book}>{bookName(g.usfm)}</h2>
          {g.items.map((r) => (
            <Link key={`${r.chapter}:${r.verse}`} href={`/study/bible/${r.usfm}/${r.chapter}?v=${r.verse}`} className={styles.row}>
              <span className={styles.ref}>{r.chapter}:{r.verse}</span>
              <span className={styles.text}>
                {highlight(r.text, terms).map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
              </span>
            </Link>
          ))}
        </section>
      ))}

      {total > PAGE ? (
        <nav className={styles.pager} aria-label="Páginas">
          {page > 1 ? <Link href={href({ p: page - 1 })} className={styles.chip}>Anteriores</Link> : <span />}
          {page < last ? <Link href={href({ p: page + 1 })} className={styles.chip}>Próximos {PAGE}</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
