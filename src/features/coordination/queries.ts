// Consultas de Coordenação. Migra do blob app_state para as tabelas relacionais
// coordination_posts / coordination_tasks (que já existiam vazias). RLS por org.
import type { DB } from "@/lib/auth/session";
import type { Post, Task } from "./types";

export async function listPosts(supabase: DB, orgId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("coordination_posts")
    .select("id, title, body, team, posted_on")
    .eq("org_id", orgId)
    .order("posted_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body ?? "",
    team: r.team ?? "Geral",
    date: (r.posted_on ?? "").slice(0, 10),
  }));
}

export async function listTasks(supabase: DB, orgId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("coordination_tasks")
    .select("id, text, assignee, done, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    text: r.text,
    who: r.assignee ?? "",
    done: r.done,
  }));
}
