import { requireOrg } from "@/lib/auth/session";
import { Sidebar, type NavCounts } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";

// Casca protegida. Toda rota deste grupo passa por requireOrg no servidor:
// sem sessão → /login; sem org → /onboarding. Nada aqui confia no navegador.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, orgId } = await requireOrg();

  const [orgRes, campusRes, peopleRes] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
    supabase.from("sticks").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("archived", false),
  ]);

  const orgName = orgRes.data?.name ?? "Minha igreja";
  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = campuses[0] ?? "";
  const userLabel = user.email?.split("@")[0] ?? "Você";

  // inbox/tasks derivam de features ainda não migradas (Fase 4) → 0 por ora.
  const counts: NavCounts = { inbox: 0, people: peopleRes.count ?? 0, tasks: 0 };

  return (
    <div className="app">
      <Sidebar userLabel={userLabel} counts={counts} />
      <div className="main">
        <Topbar orgName={orgName} campuses={campuses} activeCampus={activeCampus} />
        <div className="content view-in">{children}</div>
      </div>
    </div>
  );
}
