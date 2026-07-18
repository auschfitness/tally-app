import Link from "next/link";
import { requireOrg, can } from "@/lib/auth/session";
import { getCreateSpaceOptions, listSpaces } from "@/features/spaces/queries";
import { countLabel, groupSpacesByKind, spaceKindSingular } from "@/features/spaces/domain";
import { NewSpace } from "@/features/spaces/components/NewSpace";
import styles from "@/features/spaces/spaces.module.css";

// Hub dos Espaços (Server Component). Lista os espaços da org agrupados por tipo
// (Igreja · Ministérios · Grupos). "Novo espaço" só para quem tem org.manage. O RLS é
// a barreira real; ler = membro da org.
export default async function SpacesPage() {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const canManageOrg = can(ctx, "org.manage");

  const [spaces, options] = await Promise.all([
    listSpaces(supabase, orgId),
    canManageOrg ? getCreateSpaceOptions(supabase, orgId) : Promise.resolve(null),
  ]);
  const groups = groupSpacesByKind(spaces);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">Comunicação</h1>
          <p className="sub" style={{ margin: 0 }}>
            Espaços de conversa da igreja, dos ministérios e dos grupos.
          </p>
        </div>
        {options ? <NewSpace options={options} /> : null}
      </div>

      {groups.length === 0 ? (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Ainda não há espaços.
            <br />
            <span className="muted">
              {canManageOrg
                ? "Crie o primeiro com “Novo espaço”."
                : "Peça a quem administra a igreja para criar o primeiro."}
            </span>
          </div>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.kind} className={styles.section}>
            <div className={styles.sectionLabel}>{g.label}</div>
            <div className={styles.grid}>
              {g.spaces.map((s) => (
                <Link key={s.id} href={`/spaces/${s.id}`} className={styles.spaceCard}>
                  <span className={styles.badge}>{spaceKindSingular(s.kind)}</span>
                  <div className={styles.spaceName}>{s.name}</div>
                  {s.description ? <div className={styles.spaceDesc}>{s.description}</div> : null}
                  <div className={styles.spaceMeta}>{countLabel(s.postCount, "post", "posts")}</div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}
