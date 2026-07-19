// Consultas dos Espaços. O RLS (membro da org) já restringe; o filtro explícito por
// org_id é defesa em profundidade. Hub (espaços + contagem de posts), quadro (posts +
// autor + nº de comentários), post aberto (+ comentários) e as opções para criar um
// espaço (ministérios/grupos ainda sem espaço, e se a Igreja já existe).
import type { DB } from "@/lib/auth/session";
import { asVisibility, countByKey } from "./domain";
import type {
  Comment,
  CreateSpaceOptions,
  OrgMember,
  PostDetail,
  PostListItem,
  Space,
  SpaceHeader,
  SpaceKind,
  TodoList,
} from "./types";

function asKind(s: string | null): SpaceKind {
  return s === "church" || s === "ministry" || s === "group" ? s : "group";
}

// Mapa userId→nome dos membros da org (profiles: full_name → email → "Usuário"). Mesmo
// padrão do Care; profiles pode não ser legível para todos, então cai no que der.
async function memberNameMap(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const mem = await supabase.from("memberships").select("user_id").eq("org_id", orgId);
  const ids = (mem.data ?? []).map((m) => m.user_id);
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const prof = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  for (const p of prof.data ?? []) map.set(p.id, p.full_name || p.email || "Usuário");
  return map;
}

function nameOf(map: Map<string, string>, id: string | null): string {
  return (id ? map.get(id) : undefined) ?? "Usuário";
}

// Hub: espaços não arquivados da org + a contagem de posts (não arquivados) de cada um.
export async function listSpaces(supabase: DB, orgId: string): Promise<Space[]> {
  const { data: rows } = await supabase
    .from("spaces")
    .select("id, kind, ref_id, name, description, archived, created_at")
    .eq("org_id", orgId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  const spaces = rows ?? [];
  if (spaces.length === 0) return [];

  const ids = spaces.map((s) => s.id);
  const { data: posts } = await supabase
    .from("space_posts")
    .select("space_id")
    .eq("org_id", orgId)
    .eq("archived", false)
    .in("space_id", ids);
  const counts = countByKey((posts ?? []).map((p) => p.space_id));

  return spaces.map((s) => ({
    id: s.id,
    kind: asKind(s.kind),
    refId: s.ref_id,
    name: s.name,
    description: s.description ?? "",
    archived: s.archived,
    postCount: counts[s.id] ?? 0,
    createdAt: s.created_at,
  }));
}

// Cabeçalho de um espaço (para a tela do quadro).
export async function getSpace(supabase: DB, orgId: string, id: string): Promise<SpaceHeader | null> {
  const { data: s } = await supabase
    .from("spaces")
    .select("id, kind, name, description, archived, visibility")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!s) return null;
  return {
    id: s.id,
    kind: asKind(s.kind),
    name: s.name,
    description: s.description ?? "",
    archived: s.archived,
    visibility: asVisibility(s.visibility),
  };
}

// Posts de um espaço (não arquivados) com autor e nº de comentários. A ordenação
// fixados-primeiro é aplicada no domínio pela página.
export async function listPosts(supabase: DB, orgId: string, spaceId: string): Promise<PostListItem[]> {
  const { data: rows } = await supabase
    .from("space_posts")
    .select("id, title, author_id, pinned, created_at")
    .eq("org_id", orgId)
    .eq("space_id", spaceId)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const posts = rows ?? [];
  if (posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const { data: comments } = await supabase
    .from("space_post_comments")
    .select("post_id")
    .eq("org_id", orgId)
    .in("post_id", ids);
  const counts = countByKey((comments ?? []).map((c) => c.post_id));

  const names = await memberNameMap(supabase, orgId);
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    authorId: p.author_id ?? "",
    authorName: nameOf(names, p.author_id),
    pinned: p.pinned,
    commentCount: counts[p.id] ?? 0,
    createdAt: p.created_at,
  }));
}

// Post aberto + comentários (mais antigos primeiro).
export async function getPost(
  supabase: DB,
  orgId: string,
  spaceId: string,
  postId: string,
): Promise<{ post: PostDetail; comments: Comment[] } | null> {
  const { data: p } = await supabase
    .from("space_posts")
    .select("id, space_id, title, body, author_id, pinned, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("space_id", spaceId)
    .eq("id", postId)
    .eq("archived", false)
    .maybeSingle();
  if (!p) return null;

  const { data: crows } = await supabase
    .from("space_post_comments")
    .select("id, author_id, body, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const names = await memberNameMap(supabase, orgId);
  const post: PostDetail = {
    id: p.id,
    spaceId: p.space_id,
    title: p.title,
    body: p.body,
    authorId: p.author_id ?? "",
    authorName: nameOf(names, p.author_id),
    pinned: p.pinned,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
  const comments = (crows ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    authorId: c.author_id ?? "",
    authorName: nameOf(names, c.author_id),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
  return { post, comments };
}

// Opções do "Novo espaço": se a Igreja já existe (bloqueia duplicar) e ministérios/grupos
// ainda SEM espaço (para não escolher duas vezes o mesmo).
export async function getCreateSpaceOptions(supabase: DB, orgId: string): Promise<CreateSpaceOptions> {
  const [spacesRes, minRes, grpRes] = await Promise.all([
    supabase.from("spaces").select("kind, ref_id").eq("org_id", orgId),
    supabase.from("ministries").select("id, name").eq("org_id", orgId).eq("status", "active").order("name"),
    supabase.from("groups").select("id, name").eq("org_id", orgId).eq("archived", false).order("name"),
  ]);

  const existing = spacesRes.data ?? [];
  const churchExists = existing.some((s) => s.kind === "church");
  const usedRefs = new Set(existing.map((s) => s.ref_id).filter((x): x is string => Boolean(x)));

  const ministries = (minRes.data ?? [])
    .filter((m) => !usedRefs.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));
  const groups = (grpRes.data ?? [])
    .filter((g) => !usedRefs.has(g.id))
    .map((g) => ({ id: g.id, name: g.name }));

  return { churchExists, ministries, groups };
}

// ---- Tarefas (Fase 2) ----

// Membros da org COM conta (via memberships), como candidatos a responsável. Ordenados
// por nome. NÃO usa sticks nesta fase — só quem loga.
export async function listOrgMembers(supabase: DB, orgId: string): Promise<OrgMember[]> {
  const map = await memberNameMap(supabase, orgId);
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

// Listas de tarefas (não arquivadas) de um espaço + seus itens, com o nome do
// responsável resolvido. A ordenação dos itens é aplicada no domínio pela UI.
export async function listTodoLists(supabase: DB, orgId: string, spaceId: string): Promise<TodoList[]> {
  const { data: listRows } = await supabase
    .from("space_todo_lists")
    .select("id, name, archived, created_by, created_at")
    .eq("org_id", orgId)
    .eq("space_id", spaceId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  const lists = listRows ?? [];
  if (lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);
  const [{ data: todoRows }, names] = await Promise.all([
    supabase
      .from("space_todos")
      .select("id, list_id, title, notes, assignee_id, due_on, done, position, created_by")
      .eq("org_id", orgId)
      .in("list_id", listIds),
    memberNameMap(supabase, orgId),
  ]);

  const byList = new Map<string, TodoList["todos"]>();
  for (const id of listIds) byList.set(id, []);
  for (const t of todoRows ?? []) {
    const bucket = byList.get(t.list_id);
    if (!bucket) continue;
    bucket.push({
      id: t.id,
      listId: t.list_id,
      title: t.title,
      notes: t.notes ?? "",
      assigneeId: t.assignee_id,
      assigneeName: t.assignee_id ? names.get(t.assignee_id) ?? "Usuário" : null,
      dueOn: t.due_on,
      done: t.done,
      position: t.position,
      createdBy: t.created_by ?? "",
    });
  }

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    archived: l.archived,
    createdBy: l.created_by ?? "",
    todos: byList.get(l.id) ?? [],
  }));
}
