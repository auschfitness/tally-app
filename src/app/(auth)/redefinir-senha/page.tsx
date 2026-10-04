import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandPanel } from "../login/BrandPanel";
import { ResetForm } from "./ResetForm";
import s from "../login/login.module.css";

export default async function ResetPage({ searchParams }: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <div className={s.page}>
      <BrandPanel />
      <main className={s.pane}>
        {data.user && expired !== "1" ? (
          <ResetForm />
        ) : (
          <div className={s.form}>
            <h1 className={s.title}>Redefinir senha</h1>
            <p className={s.sub}>Link expirado. Peça um novo.</p>
            <p className={s.switch}>
              <Link href="/esqueci-senha">Pedir novo link</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
