import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { CampusSwitcher } from "@/components/shared/CampusSwitcher";

// Barra superior: igreja, seletor de campus (troca o campus ativo — cookie global)
// e tema.
export function Topbar({
  orgName,
  campuses,
  activeCampus,
}: {
  orgName: string;
  campuses: string[];
  activeCampus: string;
}) {
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
      <CampusSwitcher campuses={campuses} activeCampus={activeCampus} />
      <span className="plan">Seed · grátis</span>
      <div className="spacer" />
      <ThemeToggle />
    </div>
  );
}
