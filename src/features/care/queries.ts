// Consultas de Care. RLS por PERMISSÃO: ler `care_items` exige `care.view` (a
// checagem de UI fica na page via `can`; aqui a RLS é a barreira real — sem
// permissão volta [] em vez de erro). `care_notes`/`care_contacts` não têm org_id:
// são buscados por `care_item_id IN (ids dos itens já filtrados por RLS)`.
//
// Nomes: PESSOA cuidada via `sticks`; RESPONSÁVEL/AUTOR (auth.users) via
// `memberships`+`profiles` (NUNCA sticks). Ver docs/handoffs/care-supabase.md.
import type { DB } from "@/lib/auth/session";
import type { CareItem, CarePriority, CareStatus, MemberOption } from "./types";

const PRIORITIES = new Set<CarePriority>(["celebration", "notice", "attention", "urgent"]);
const STATUSES = new Set<CareStatus>(["new", "assigned", "in_progress", "waiting", "resolved", "closed"]);
function priOr(v: string | null): CarePriority {
  return v && PRIORITIES.has(v as CarePriority) ? (v as CarePriority) : "attention";
}
function statusOr(v: string | null): CareStatus {
  return v && STATUSES.has(v as CareStatus) ? (v as CareStatus) : "new";
}

// Mapa userId→nome dos membros da org (profiles: full_name → email → "Usuário").
// profiles pode não ser legível para todos os co-membros; resolve o que der.
async function memberNameMap(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const mem = await supabase.from("memberships").select("user_id").eq("org_id", orgId);
  const ids = (mem.data ?? []).map((m) => m.user_id);
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const prof = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  for (const p of prof.data ?? []) map.set(p.id, p.full_name || p.email || "Usuário");
  for (const id of ids) if (!map.has(id)) map.set(id, "Usuário");
  return map;
}

// Responsáveis atribuíveis (staff = membros da org). Ordenados por nome.
export async function listCareMembers(supabase: DB, orgId: string): Promise<MemberOption[]> {
  const map = await memberNameMap(supabase, orgId);
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// Carrega os Care Items da org (com contatos e notas + nomes resolvidos).
export async function loadCare(supabase: DB, orgId: string): Promise<CareItem[]> {
  const itemsRes = await supabase
    .from("care_items")
    .select(
      "id, stick_id, signal_id, category, title, description, assigned_to, priority, status, due_date, confidentiality_level, next_action, created_at, resolved_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  const rows = itemsRes.data ?? [];
  const ids = rows.map((r) => r.id);

  const [notesRes, contactsRes, sticksRes, members] = await Promise.all([
    ids.length ? supabase.from("care_notes").select("id, care_item_id, author_id, visibility, content, created_at").in("care_item_id", ids) : Promise.resolve({ data: [] as never[] }),
    ids.length ? supabase.from("care_contacts").select("id, care_item_id, stick_id, contacted_by, contacted_on, method, note, created_at").in("care_item_id", ids) : Promise.resolve({ data: [] as never[] }),
    supabase.from("sticks").select("id, full_name").eq("org_id", orgId),
    memberNameMap(supabase, orgId),
  ]);

  const stickName = new Map<string, string>();
  for (const s of sticksRes.data ?? []) stickName.set(s.id, s.full_name);
  const memberName = (id: string | null): string => (id && members.get(id)) || "—";

  const notesByItem = new Map<string, CareItem["notes"]>();
  for (const n of (notesRes.data ?? []) as { id: string; care_item_id: string; author_id: string | null; visibility: string | null; content: string | null; created_at: string }[]) {
    const list = notesByItem.get(n.care_item_id) ?? notesByItem.set(n.care_item_id, []).get(n.care_item_id)!;
    list.push({ id: n.id, content: n.content ?? "", visibility: n.visibility ?? "", authorName: memberName(n.author_id), created_at: n.created_at });
  }

  const contactsByItem = new Map<string, CareItem["contacts"]>();
  for (const c of (contactsRes.data ?? []) as { id: string; care_item_id: string; contacted_by: string | null; contacted_on: string; method: string | null; note: string | null }[]) {
    const list = contactsByItem.get(c.care_item_id) ?? contactsByItem.set(c.care_item_id, []).get(c.care_item_id)!;
    list.push({ id: c.id, contacted_on: c.contacted_on, method: c.method ?? "", note: c.note ?? "", byName: memberName(c.contacted_by) });
  }

  return rows.map((r) => ({
    id: r.id,
    stick_id: r.stick_id ?? null,
    stickName: (r.stick_id && stickName.get(r.stick_id)) || "",
    signal_id: r.signal_id ?? null,
    category: r.category ?? "",
    title: r.title ?? "",
    description: r.description ?? "",
    assigned_to: r.assigned_to ?? null,
    assignedName: memberName(r.assigned_to),
    priority: priOr(r.priority),
    status: statusOr(r.status),
    due_date: r.due_date ?? "",
    confidentiality_level: r.confidentiality_level ?? "standard",
    next_action: r.next_action ?? "",
    created_at: r.created_at,
    resolved_at: r.resolved_at ?? null,
    contacts: (contactsByItem.get(r.id) ?? []).sort((a, b) => b.contacted_on.localeCompare(a.contacted_on)),
    notes: (notesByItem.get(r.id) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }));
}
