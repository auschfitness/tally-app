// Marca do Tally (o "tally mark" azul). SVG puro, sem dependência.
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="2" width="96" height="96" rx="26" fill="#2B5CE6" />
      <g stroke="#fff" strokeWidth="6" strokeLinecap="round">
        <line x1="34" y1="34" x2="34" y2="66" />
        <line x1="43" y1="34" x2="43" y2="66" />
        <line x1="52" y1="34" x2="52" y2="66" />
        <line x1="61" y1="34" x2="61" y2="66" />
        <line x1="28" y1="68" x2="67" y2="32" />
      </g>
    </svg>
  );
}
