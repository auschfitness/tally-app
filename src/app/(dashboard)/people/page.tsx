import { PeopleScreen } from "@/features/sticks/components/PeopleScreen";

// Pessoas: lista + ficha. Filtros e seleção na querystring (?s=&cargo=&aniv=&celula=&q=&p=).
export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PeopleScreen sp={await searchParams} />;
}
