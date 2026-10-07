// Selo da Mercy: círculo verde com o cordeiro recortado. O arquivo é só a silhueta
// (cordeiro vazado), usado como máscara; a cor vem de --blue (ação), então o cordeiro
// sempre mostra o fundo e o selo troca sozinho entre claro e escuro.
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        background: "var(--blue)",
        mask: "url(/mercy-selo.svg) center / contain no-repeat",
        WebkitMask: "url(/mercy-selo.svg) center / contain no-repeat",
      }}
    />
  );
}
