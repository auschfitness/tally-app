// Donut leve por CSS (conic-gradient) — sem Chart.js, tema-reativo via CSS vars,
// sem lifecycle de canvas nem risco de hidratação. Usado onde antes havia donut
// (composição de Sticks, despesas de Finance, saúde de Grupos, risco na Home).
export interface DonutSegment {
  value: number;
  color: string;
}

export function ConicDonut({
  segments,
  size = 150,
  hole = 44,
  children,
}: {
  segments: DonutSegment[];
  size?: number;
  hole?: number;
  children?: React.ReactNode;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / (total || 1)) * 100;
      acc += s.value;
      const end = (acc / (total || 1)) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");
  const background = total > 0 ? `conic-gradient(${stops})` : "var(--surface-2)";
  const mask = `radial-gradient(circle ${hole}px at center, transparent 98%, #000 100%)`;

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background, mask, WebkitMask: mask }} />
      {children ? <div className="donutctr">{children}</div> : null}
    </div>
  );
}
