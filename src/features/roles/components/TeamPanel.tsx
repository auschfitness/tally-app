"use client";

// Aba "Equipe e cargos" (Configurações). Duas partes: quem tem acesso (e com que cargo)
// e os cargos da igreja. Pessoas vem primeiro: é a pergunta do dia a dia ("quem pode o
// quê?"); mexer em cargo é mais raro.
// Gating: `members.manage` (Dono/Pastor/Tesoureiro) edita; os demais veem somente-leitura.
import { MemberList } from "./MemberList";
import { RoleList } from "./RoleList";
import type { TeamData } from "../types";
import styles from "../roles.module.css";

export function TeamPanel({ data }: { data: TeamData }) {
  return (
    <div className="panel">
      {data.canManage ? null : (
        <div className={styles.note}>Você pode ver a equipe e os cargos. Só o dono, o pastor ou o tesoureiro pode alterar.</div>
      )}
      <MemberList members={data.members} roles={data.roles} canManage={data.canManage} />
      <RoleList roles={data.roles} canManage={data.canManage} />
    </div>
  );
}
