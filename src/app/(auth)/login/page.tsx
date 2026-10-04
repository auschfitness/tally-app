import { BrandPanel } from "./BrandPanel";
import { LoginForm } from "./LoginForm";
import s from "./login.module.css";

// Destino pós-login: só caminho interno (evita open redirect). Usado pelo convite.
function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className={s.page}>
      <BrandPanel />
      <main className={s.pane}>
        <LoginForm next={safeNext(next)} />
      </main>
    </div>
  );
}
