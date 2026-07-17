// Mini-gráfico de Frequência (SVG, Server Component). Barras das últimas semanas
// com DADO REAL de presença de célula (DNA #2 — sem Chart.js, sem número inventado).
// Vazio quando ainda não há histórico.
import type { WeekPoint } from "../domain";

export function FrequencyChart({ points }: { points: WeekPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const hasData = points.some((p) => p.count > 0);
  if (!hasData) {
    return <div className="empty">Sem histórico de presença ainda. Registre presença nas células para ver a tendência.</div>;
  }

  const W = 320;
  const H = 120;
  const pad = 18;
  const n = points.length;
  const bw = (W - pad * 2) / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Frequência das últimas semanas">
      {points.map((p, i) => {
        const h = Math.round((p.count / max) * (H - pad * 2));
        const x = pad + i * bw;
        const y = H - pad - h;
        return (
          <g key={p.label}>
            <rect x={x + 3} y={y} width={bw - 6} height={h} rx={3} fill="var(--blue, #2B5CE6)" opacity={i === n - 1 ? 1 : 0.55} />
            {p.count > 0 ? (
              <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="var(--text-2, #6b7280)">
                {p.count}
              </text>
            ) : null}
            <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize={8} fill="var(--text-2, #6b7280)">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
