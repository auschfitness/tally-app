// Modelos de front dos Espaços (Comunicação estilo Basecamp — Fase 1). Sem I/O: só
// as formas que a UI, o domínio puro e as Server Actions trocam. As linhas do banco
// (spaces, space_posts, space_post_comments) são mapeadas para cá nas queries.

// Tipo do espaço (spaces.kind). "church" é único por org (ref_id null); "ministry" e
// "group" apontam para ministries/groups via ref_id.
export type SpaceKind = "church" | "ministry" | "group";

// Quem enxerga o espaço (spaces.visibility). "leaders" (padrão) = só a liderança;
// "members" = todos os membros com conta. O RLS filtra tudo em cascata (posts,
// comentários, listas, tarefas, chat) — o front só expõe o controle.
export type SpaceVisibility = "leaders" | "members";

// Um espaço, com a contagem de posts já resolvida (para os cartões do hub).
export interface Space {
  id: string;
  kind: SpaceKind;
  refId: string | null;
  name: string;
  description: string;
  archived: boolean;
  postCount: number;
  createdAt: string; // ISO
}

// Espaços agrupados por tipo (uma seção do hub: Igreja · Ministérios · Grupos).
export interface SpaceGroup {
  kind: SpaceKind;
  label: string;
  spaces: Space[];
}

// Cabeçalho do espaço na tela do quadro (/spaces/[id]).
export interface SpaceHeader {
  id: string;
  kind: SpaceKind;
  name: string;
  description: string;
  archived: boolean;
  visibility: SpaceVisibility;
}

// Um post na lista do quadro (com autor e nº de comentários).
export interface PostListItem {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  pinned: boolean;
  commentCount: number;
  createdAt: string; // ISO
}

// Post aberto (/spaces/[id]/posts/[postId]).
export interface PostDetail {
  id: string;
  spaceId: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Um comentário do post.
export interface Comment {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

// Opção de referência (um ministério ou grupo) para criar um espaço.
export interface RefOption {
  id: string;
  name: string;
}

// Insumos do formulário "Novo espaço": se a Igreja já existe (bloqueia duplicar) e as
// listas de ministérios/grupos ainda SEM espaço (evita escolher duas vezes).
export interface CreateSpaceOptions {
  churchExists: boolean;
  ministries: RefOption[];
  groups: RefOption[];
}

// ---- Tarefas (Fase 2): to-dos por espaço ----

// Um item de tarefa (space_todos), com o nome do responsável já resolvido.
export interface Todo {
  id: string;
  listId: string;
  title: string;
  notes: string;
  assigneeId: string | null;
  assigneeName: string | null; // resolvido de memberships/profiles; null = sem responsável
  dueOn: string | null; // ISO (aaaa-mm-dd) ou null
  done: boolean;
  position: number;
  createdBy: string;
}

// Uma lista de tarefas (space_todo_lists) com seus itens.
export interface TodoList {
  id: string;
  name: string;
  archived: boolean;
  createdBy: string;
  todos: Todo[];
}

// Membro da org COM conta (auth.users via memberships) — candidato a responsável.
export interface OrgMember {
  id: string; // user id (auth.users)
  name: string;
}

// ---- Chat ao vivo (Fase 4): sala contínua por espaço (space_chat_messages) ----

// Uma mensagem do chat, com o nome do remetente já resolvido.
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string; // ISO
}
