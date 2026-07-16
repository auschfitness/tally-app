import Link from "next/link";

export default function NotFound() {
  return (
    <div className="gate">
      <div className="gcard">
        <div className="gtitle">Página não encontrada</div>
        <div className="gsub">O endereço que você abriu não existe no Tally.</div>
        <Link href="/" className="gbtn" style={{ display: "block", textDecoration: "none" }}>
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
