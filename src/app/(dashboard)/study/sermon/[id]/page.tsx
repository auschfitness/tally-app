import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSermons, listSeries } from "@/features/study/queries";
import { listServices } from "@/features/services/queries";
import { SermonEditor } from "@/features/study/components/SermonEditor";

// Editor de sermão. `[id]` = "new" (novo) ou o uuid de um sermão existente.
export default async function SermonEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
}) {
  const { id } = await params;
  const { supabase, orgId, user } = await requireOrg();
  const sp = await searchParams;

  const [sermons, series, services, campusRes, profRes] = await Promise.all([
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    listServices(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
    supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle(),
  ]);

  const isNew = id === "new";
  const sermon = isNew ? null : sermons.find((s) => s.id === id) ?? null;
  if (!isNew && !sermon) notFound();

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";
  const serviceOpts = services.map((s) => ({ id: s.id, name: s.name }));

  const locale = profRes.data?.locale ?? "pt-BR";

  return <SermonEditor sermon={sermon} series={series} services={serviceOpts} campuses={campuses} activeCampus={activeCampus} locale={locale} />;
}
