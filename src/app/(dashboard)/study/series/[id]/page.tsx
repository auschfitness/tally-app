import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSermons, listSeries } from "@/features/study/queries";
import { SERIES_BAND, SERIES_LBL, STATUS_BAND, STATUS_LBL, sortSermonsByDate } from "@/features/study/domain";
import { AddSermonToSeries, EditSeriesButton } from "@/features/study/components/SeriesControls";
import { setSermonSeriesAction } from "@/features/study/actions";
import { brDate } from "@/lib/utils/date";

// Workspace da série: visão/tema, escrituras-chave (das passagens reais dos sermões),
// período e cronograma. Vincular/desvincular sermões.
export default async function SeriesWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId } = await requireOrg();

  const [series, sermons] = await Promise.all([listSeries(supabase, orgId), listSermons(supabase, orgId)]);
  const se = series.find((s) => s.id === id);
  if (!se) notFound();

  const mine = sortSermonsByDate(sermons.filter((s) => s.series_id === id), "asc");
  const addable = sermons.filter((s) => s.series_id !== id).map((s) => ({ id: s.id, title: s.title }));

  // Escrituras-chave: passagens principais distintas dos sermões da série.
  const keyScr: string[] = [];
  const seen = new Set<string>();
  for (const s of mine) {
    const p = (s.main_passage || "").trim();
    if (p && !seen.has(p)) {
      seen.add(p);
      keyScr.push(p);
    }
  }
  const period = se.start_date || se.end_date ? (brDate(se.start_date) || "…") + " — " + (brDate(se.end_date) || "…") : "sem período definido";

  return (
    <>
      <Link href="/study" className="link">← Voltar à biblioteca</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{se.title || "(sem título)"}</h1>
          <p className="sub" style={{ margin: 0 }}>{se.theme || "Série de ensino"}</p>
        </div>
        <EditSeriesButton series={se} />
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Visão</h3><span className={`hb ${SERIES_BAND[se.status] || "attention"}`} style={{ marginLeft: "auto" }}>{SERIES_LBL[se.status] || se.status}</span></div>
          {se.description ? <p style={{ margin: "0 0 12px" }}>{se.description}</p> : <p className="muted" style={{ margin: "0 0 12px" }}>Sem descrição da visão ainda.</p>}
          <div className="field"><label>Período</label><div>{period}</div></div>
          <div className="field">
            <label>Escrituras-chave</label>
            {keyScr.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keyScr.map((p) => <span key={p} className="chip" style={{ background: "rgba(43,92,230,.10)", color: "var(--blue)" }}>{p}</span>)}
              </div>
            ) : (
              <div className="muted">As escrituras-chave aparecem conforme você define a passagem de cada sermão.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="ph"><h3>Cronograma</h3><span className="muted" style={{ marginLeft: "auto" }}>{mine.length} {mine.length === 1 ? "sermão" : "sermões"}</span></div>
          {mine.length === 0 ? (
            <div className="empty">Sem sermões ainda. Vincule um sermão a esta série abaixo — ou defina a série no editor do sermão.</div>
          ) : (
            mine.map((s) => (
              <div className="li" key={s.id}>
                <Link href={`/study/sermon/${s.id}`} className="av">{s.sermon_date ? brDate(s.sermon_date).slice(0, 5) : "—"}</Link>
                <div style={{ flex: 1 }}>
                  <div><Link href={`/study/sermon/${s.id}`}><b>{s.title || "(sem título)"}</b></Link></div>
                  {s.main_passage ? <div className="meta">{s.main_passage}</div> : null}
                </div>
                <div className="right">
                  <span className={`hb ${STATUS_BAND[s.status] || "attention"}`}>{STATUS_LBL[s.status] || s.status}</span>
                  <form action={setSermonSeriesAction} style={{ display: "inline" }}>
                    <input type="hidden" name="sermonId" value={s.id} />
                    <input type="hidden" name="seriesId" value="" />
                    <input type="hidden" name="backTo" value={`/study/series/${id}`} />
                    <button className="link" type="submit">remover</button>
                  </form>
                </div>
              </div>
            ))
          )}
          <AddSermonToSeries seriesId={id} options={addable} />
        </div>
      </div>
    </>
  );
}
