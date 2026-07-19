"use client";

// Casca do espaço (Client): alterna entre o quadro de mensagens e as tarefas, com um
// atalho para o Chat ao vivo (rota própria /spaces/[id]/chat). Três abas no topo
// "Mensagens | Tarefas | Chat"; Mensagens/Tarefas são superfícies locais, Chat navega. Os
// dados vêm prontos do Server Component (page.tsx) — aqui só a troca de aba.
import { useState } from "react";
import Link from "next/link";
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
  initialTab = "messages",
}: {
  spaceId: string;
  userId: string;
  canManageOrg: boolean;
  posts: PostListItem[];
  lists: TodoList[];
  members: OrgMember[];
  todayIso: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <>
      <div className="filtchips" style={{ marginBottom: 16 }}>
        <button className={`fchip${tab === "messages" ? " on" : ""}`} type="button" onClick={() => setTab("messages")}>
          Mensagens
        </button>
        <button className={`fchip${tab === "todos" ? " on" : ""}`} type="button" onClick={() => setTab("todos")}>
          Tarefas
        </button>
        <Link className="fchip" href={`/spaces/${spaceId}/chat`} style={{ textDecoration: "none" }}>
          Chat
        </Link>
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
