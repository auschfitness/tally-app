import { ThemeToggle } from "@/components/shared/ThemeToggle";

// Barra superior: igreja e tema. Uma igreja = um local: não há mais seletor de campus.
export function Topbar({ orgName }: { orgName: string }) {
  return (
    <div className="top">
      <div className="church">
        <div className="logo">
          <svg width="17" height="17" viewBox="0 0 100 100" aria-hidden>
            <g stroke="#4C7BFF" strokeWidth="7" strokeLinecap="round">
              <line x1="34" y1="32" x2="34" y2="68" />
              <line x1="45" y1="32" x2="45" y2="68" />
              <line x1="56" y1="32" x2="56" y2="68" />
              <line x1="67" y1="32" x2="67" y2="68" />
              <line x1="28" y1="70" x2="73" y2="30" />
            </g>
          </svg>
        </div>
        <div>
          <b>{orgName}</b>
          <span>Administrador</span>
        </div>
      </div>
      <span className="plan">Seed · grátis</span>
      <div className="spacer" />
      <ThemeToggle />
    </div>
  );
}
