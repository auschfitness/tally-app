"use client";

// Fronteira de erro do App Router. Mensagem amigável — nunca stack/SQL/token.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="gate">
      <div className="gcard">
        <div className="gtitle">Algo deu errado</div>
        <div className="gsub">Tivemos um problema ao carregar esta parte do Tally.</div>
        <button className="gbtn" onClick={() => reset()}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
