// Domínio PURO dos Espaços. Sem I/O, determinístico, testável: agrupar espaços por
// tipo (na ordem Igreja · Ministérios · Grupos), ordenar posts (fixados primeiro,
// depois mais recentes), montar contadores e decidir quem pode gerenciar (autor ou
// org.manage). A leitura do banco vive em queries.ts; aqui só a lógica.
import type { Space, SpaceGroup, SpaceKind, SpaceVisibility } from "./types";

// Ordem canônica das seções do hub.
export const SPACE_KIND_ORDER: SpaceKind[] = ["church", "ministry", "group"];

const KIND_LABEL: Record<SpaceKind, string> = {
  church: "Igreja",
  ministry: "Ministérios",
  group: "Grupos",
};

// Rótulo singular para o selo de um cartão / o tipo de um espaço.
const KIND_SINGULAR: Record<SpaceKind, string> = {
  church: "Igreja",
  ministry: "Ministério",
  group: "Grupo",
};

export function spaceKindLabel(kind: SpaceKind): string {
  return KIND_LABEL[kind] ?? "Espaço";
}

export function spaceKindSingular(kind: SpaceKind): string {
  return KIND_SINGULAR[kind] ?? "Espaço";
}

// ---- Visibilidade (quem enxerga o espaço) ----

export const SPACE_VISIBILITIES: SpaceVisibility[] = ["leaders", "members"];

const VISIBILITY_LABEL: Record<SpaceVisibility, string> = {
  leaders: "Só liderança",
  members: "Todos os membros",
};

// Coage o texto do banco (spaces.visibility é `string`) para o enum; default "leaders"
// (espaços nascem fechados).
export function asVisibility(v: string | null): SpaceVisibility {
  return v === "members" ? "members" : "leaders";
}

export function spaceVisibilityLabel(v: SpaceVisibility): string {
  return VISIBILITY_LABEL[v] ?? VISIBILITY_LABEL.leaders;
}

// Agrupa os espaços por tipo, na ordem canônica. Seções vazias somem — o hub só mostra
// um cabeçalho de tipo quando há ao menos um espaço nele.
export function groupSpacesByKind(spaces: Space[]): SpaceGroup[] {
  return SPACE_KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    spaces: spaces.filter((s) => s.kind === kind),
  })).filter((g) => g.spaces.length > 0);
}

// Ordena posts para o quadro: fixados primeiro, depois os mais recentes (createdAt ISO
// decrescente). Não muta a lista de entrada.
export function sortPostsForBoard<T extends { pinned: boolean; createdAt: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// Comentários do mais antigo ao mais novo (a leitura do banco pode já vir ordenada;
// isto garante a ordem no domínio). Não muta a entrada.
export function sortCommentsOldestFirst<T extends { createdAt: string }>(comments: T[]): T[] {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Conta ocorrências por chave (ex.: comentários por post_id, posts por space_id) para
// montar os contadores dos cartões sem N consultas.
export function countByKey(keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = (out[k] ?? 0) + 1;
  return out;
}

// Autorização de edição/exclusão: o autor sempre pode; quem tem org.manage também.
// (O RLS do banco é a barreira real; isto controla a UI e dá erro claro nas actions.)
export function canManage(userId: string, authorId: string, canManageOrg: boolean): boolean {
  return canManageOrg || userId === authorId;
}

// Rótulo de contagem de posts/comentários (PT-BR, com plural correto).
export function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ---- Tarefas (Fase 2) ----

// Ordena os itens de uma lista: não-concluídos primeiro, concluídos ao fim; dentro de
// cada grupo, por `position` crescente. Não muta a entrada.
export function sortTodos<T extends { done: boolean; position: number }>(todos: T[]): T[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.position - b.position;
  });
}

// Progresso de uma lista: quantas de quantas estão concluídas.
export function todoProgress(todos: { done: boolean }[]): { done: number; total: number } {
  return { done: todos.filter((t) => t.done).length, total: todos.length };
}

// Rótulo "X de Y concluídas" (PT-BR; concorda com "tarefas", sempre plural).
export function progressLabel(done: number, total: number): string {
  return `${done} de ${total} concluídas`;
}

// Vencido: tem prazo, não está concluído e o prazo é ANTES de hoje. Datas em ISO
// (aaaa-mm-dd) comparam lexicograficamente. `todayIso` entra como parâmetro (puro).
export function isOverdue(dueOn: string | null, done: boolean, todayIso: string): boolean {
  if (done || !dueOn) return false;
  return dueOn < todayIso;
}

// Próxima posição numa lista (fim da fila): maior position + 1, ou 0 se vazia.
export function nextPosition(todos: { position: number }[]): number {
  return todos.reduce((max, t) => Math.max(max, t.position), -1) + 1;
}
