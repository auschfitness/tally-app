"use client";

// Casca do espaço (Client): alterna entre o quadro de mensagens e as tarefas. Duas abas
// "Mensagens | Tarefas" no topo; cada superfície é seu próprio componente. Os dados vêm
// prontos do Server Component (page.tsx) — aqui só a troca de aba.
import { useState } from "react";
import { Board } from "./Board";
import { Todos } from "./Todos";
import type { OrgMember, PostListItem, TodoList } from "../types";

type Tab = "messages" | "todos";

export function SpaceView({
  spaceId,
  userId,
  canManageOrg,
  posts,
  lists,
  members,
  todayIso,
}: {
  spaceId: string;
  userId: string;
  canManageOrg: boolean;
  posts: PostListItem[];
  lists: TodoList[];
  members: OrgMember[];
  todayIso: string;
}) {
  const [tab, setTab] = useState<Tab>("messages");

  return (
    <>
      <div className="filtchips" style={{ marginBottom: 16 }}>
        <button className={`fchip${tab === "messages" ? " on" : ""}`} type="button" onClick={() => setTab("messages")}>
          Mensagens
        </button>
        <button className={`fchip${tab === "todos" ? " on" : ""}`} type="button" onClick={() => setTab("todos")}>
          Tarefas
        </button>
      </div>

      {tab === "messages" ? (
        <Board spaceId={spaceId} posts={posts} userId={userId} canManageOrg={canManageOrg} />
      ) : (
        <Todos
          spaceId={spaceId}
          lists={lists}
          members={members}
          userId={userId}
          canManageOrg={canManageOrg}
          todayIso={todayIso}
        />
      )}
    </>
  );
}
