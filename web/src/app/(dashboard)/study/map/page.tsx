import { requireOrg } from "@/lib/auth/session";
import { listScriptures, listSermons } from "@/features/study/queries";
import { ScriptureMap } from "@/features/study/components/ScriptureMap";

// Mapa de Escrituras (Server Component): cobertura dos 66 livros por uso real nos
// sermões (sermon_scriptures). Leitura pura.
export default async function ScriptureMapPage() {
  const { supabase, orgId } = await requireOrg();
  const [scriptures, sermons] = await Promise.all([listScriptures(supabase, orgId), listSermons(supabase, orgId)]);
  const lite = sermons.map((s) => ({ id: s.id, title: s.title, sermon_date: s.sermon_date }));
  return <ScriptureMap scriptures={scriptures} sermons={lite} />;
}
