// Modelos de front dos Espaços (Comunicação estilo Basecamp — Fase 1). Sem I/O: só
// as formas que a UI, o domínio puro e as Server Actions trocam. As linhas do banco
// (spaces, space_posts, space_post_comments) são mapeadas para cá nas queries.

// Tipo do espaço (spaces.kind). "church" é único por org (ref_id null); "ministry" e
// "group" apontam para ministries/groups via ref_id.
export type SpaceKind = "church" | "ministry" | "group";

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
