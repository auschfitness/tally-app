// Consultas de Oração. Mapeia prayer_requests + nome do grupo. Filtra fora os
// pedidos "podados" (respondidos há +30 dias) para preservar o comportamento do
// app (eles somem do mural) sem apagar no render — a remoção física vira tarefa
// de manutenção (ver README). RLS filtra por org.
import type { DB } from "@/lib/auth/session";
import { type PrayerRequest, type Privacy, isPrunable } from "./domain";

const PRIV: Privacy[] = ["church", "group", "leader", "private"];
function asPrivacy(v: string): Privacy {
  return (PRIV as string[]).includes(v) ? (v as Privacy) : "church";
}

export async function listPrayers(supabase: DB, orgId: string): Promise<PrayerRequest[]> {
  const [prayersRes, groupsRes] = await Promise.all([
    supabase
      .from("prayer_requests")
      .select("id, title, author_name, request, privacy, group_id, topics, praying_count, answered, answered_on, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("groups").select("id, name").eq("org_id", orgId),
  ]);

  if (prayersRes.error) throw new Error(prayersRes.error.message);

  const groupNameById = new Map<string, string>();
  for (const g of groupsRes.data ?? []) groupNameById.set(g.id, g.name);

  return (prayersRes.data ?? [])
    .map((row): PrayerRequest => ({
      id: row.id,
      title: row.title ?? "",
      author: row.author_name ?? "Anônimo",
      request: row.request ?? "",
      privacy: asPrivacy(row.privacy),
      group: (row.group_id && groupNameById.get(row.group_id)) || "",
      topics: row.topics ?? [],
      praying: row.praying_count ?? 0,
      answered: row.answered,
      answeredDate: row.answered_on,
      date: (row.created_at ?? "").slice(0, 10),
    }))
    .filter((p) => !isPrunable(p));
}
