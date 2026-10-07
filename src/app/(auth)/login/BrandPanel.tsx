import { LogoMark } from "@/components/shared/LogoMark";
import s from "./login.module.css";

export function BrandPanel() {
  return (
    <aside className={s.brand}>
      <div className={`${s.wordmark} wordmark`}>
        <LogoMark size={32} />
        mercy
      </div>
      <blockquote className={s.verse}>
        Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.
        <cite>Salmos 119.105</cite>
      </blockquote>
    </aside>
  );
}
