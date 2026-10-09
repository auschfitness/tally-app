import { PeopleScreen } from "@/features/sticks/components/PeopleScreen";

// Ficha aberta direto pela URL: mesma tela, já com esta pessoa selecionada.
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PeopleScreen sp={{}} forcedId={id} />;
}
