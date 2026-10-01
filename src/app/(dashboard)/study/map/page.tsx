import { redirect } from "next/navigation";

// O mapa de Escrituras virou "Por livro" na página Sermões.
export default function ScriptureMapPage() {
  redirect("/study?ver=livro");
}
