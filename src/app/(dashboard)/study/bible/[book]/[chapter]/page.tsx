import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { resolveActiveCampus } from "@/lib/campus";
import { usfmToOsis } from "@/lib/bible/osis";
import { fetchChapterText } from "@/lib/bible/helloao";
import { listSermons, listSeries } from "@/features/study/queries";
import { listServices } from "@/features/services/queries";
import { parseRouteRef, versesFromPlain, versesFromTagged, type ReaderVerse } from "@/features/study/reader";
import { READER_TRANSLATION, getLexShort, getOriginalChapter, getTaggedChapter } from "@/features/study/reader-queries";
import { ReaderView } from "@/features/study/components/reader/ReaderView";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Leitura da Bíblia (spec 07). Texto: bible_tagged_words quando o capítulo tem a ligação
// com o original (piloto: João); senão o texto puro da Bíblia Livre (helloao). Atrás de
// `study.reader`: desligada, a rota não existe.
export default async function BibleChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const p = await params;
  const ctx = await requireOrg();
  if (!flagOn(ctx, "study.reader")) notFound();
  const ref = parseRouteRef(p.book, p.chapter);
  if (!ref) notFound();
  const osis = usfmToOsis(ref.book);
  if (!osis) notFound();
  const { supabase, orgId, user } = ctx;

  const [tagged, original, sermons, series, services, campusRes, profRes] = await Promise.all([
    getTaggedChapter(supabase, osis, ref.chapter),
    getOriginalChapter(supabase, osis, ref.chapter),
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    listServices(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
    supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle(),
  ]);

  let verses: ReaderVerse[] = [];
  let textError = "";
  if (tagged.length) {
    verses = versesFromTagged(tagged);
  } else {
    try {
      verses = versesFromPlain(await fetchChapterText(READER_TRANSLATION, ref.book, ref.chapter));
    } catch {
      textError = "Não consegui carregar o texto agora. Tente de novo em instantes.";
    }
  }

  const strongs = [...new Set([...tagged, ...original].map((w) => w.strong).filter((s): s is string => !!s))];
  const lex = await getLexShort(supabase, strongs);
  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, undefined);

  return (
    <>
      <StudyTabs v2={flagOn(ctx, "study.library_v2")} reader />
      <ReaderView
        key={`${ref.book}-${ref.chapter}`}
        refNow={ref}
        verses={verses}
        tagged={tagged.length > 0 && flagOn(ctx, "study.interlinear")}
        original={original}
        lex={lex}
        textError={textError}
        editor={{
          sermons,
          series,
          services: services.map((s) => ({ id: s.id, name: s.name })),
          campuses,
          activeCampus,
          locale: profRes.data?.locale ?? "pt-BR",
        }}
      />
    </>
  );
}
