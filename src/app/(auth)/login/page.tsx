import { LogoMark } from "@/components/shared/LogoMark";
import { LoginForm } from "./LoginForm";

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
    <div className="gate">
      <div className="gcard">
        <LogoMark />
        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}
