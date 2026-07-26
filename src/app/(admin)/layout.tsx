import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/features/admin/queries";
import { logoutAction } from "@/app/(dashboard)/actions";
import { LogoMark } from "@/components/shared/LogoMark";
import styles from "@/features/admin/admin.module.css";

// Casca do painel super-admin. FORA do contexto de org: gateia por requireUser() +
// is_platform_admin() (nunca requireOrg — o admin não deve ser barrado por org suspensa,
// nem depender de pertencer a uma igreja). Quem não é admin da plataforma leva 404: o
// gate é no SERVIDOR, não só "esconder o link". A chrome só é renderizada depois do gate.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) notFound();

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <LogoMark size={26} />
          <span className={styles.wm}>Tally</span>
          <span className={styles.badge}>Admin</span>
        </div>
        <nav className={styles.topnav}>
          <Link href="/" className="btn ghost sm">
            Voltar ao app
          </Link>
          <form action={logoutAction}>
            <button className="btn ghost sm" type="submit">
              Sair
            </button>
          </form>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
