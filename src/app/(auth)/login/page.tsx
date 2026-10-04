import { LogoMark } from "@/components/shared/LogoMark";
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
      <aside className={s.brand}>
        <div className={s.wordmark}>
          <LogoMark size={32} />
          Tally
        </div>
        <blockquote className={s.verse}>
          Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.
          <cite>Salmos 119.105</cite>
        </blockquote>
        <p className={s.tagline}>Estudo da Bíblia com a palavra ligada ao grego e ao hebraico.</p>
      </aside>
      <main className={s.pane}>
        <LoginForm next={safeNext(next)} />
      </main>
    </div>
  );
}
