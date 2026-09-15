import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { listSeries } from "@/features/study/queries";
import { SeriesBoard } from "@/features/study/components/SeriesBoard";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Séries (Server Component). Existe só com `study.library_v2` ligada — é a casa que
// recebe o "+ Nova série" que saiu da barra da biblioteca. Flag desligada, a rota não
// existe (404) e a criação de série continua na barra de hoje, como sempre esteve.
export default async function StudySeriesPage() {
  const ctx = await requireOrg();
  if (!flagOn(ctx, "study.library_v2")) notFound();

  const series = await listSeries(ctx.supabase, ctx.orgId);
  return (
    <>
      <StudyTabs v2 />
      <SeriesBoard series={series} />
    </>
  );
}
