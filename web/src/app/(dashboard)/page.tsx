import { requireOrg } from "@/lib/auth/session";

// Placeholder da Home. A Home real (Pulse, frequência, Care Radar, etc.) é
// migrada na Fase 4, depois que as features que ela agrega existirem.
export default async function HomePage() {
  const { user } = await requireOrg();
  const name = user.email?.split("@")[0] ?? "";

  return (
    <>
      <h1 className="page">Bom te ver, {name}</h1>
      <p className="sub">A fundação Next.js está no ar. As telas são migradas feature a feature.</p>
      <div className="panel">
        <p className="muted">
          Fundação (Fase 2) e casca (Fase 3) prontas. Próximo: migrar as features — começando por
          Sticks — para Server Components + Server Actions, preservando o comportamento atual.
        </p>
      </div>
    </>
  );
}
