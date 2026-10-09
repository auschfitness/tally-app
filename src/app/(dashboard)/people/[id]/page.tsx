import { redirect } from "next/navigation";

// Ficha aberta direto pela URL. A tela de verdade chega com a lista e a ficha (A3/A4).
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/people?p=${encodeURIComponent(id)}`);
}
