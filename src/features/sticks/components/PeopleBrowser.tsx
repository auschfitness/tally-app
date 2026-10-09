"use client";

// Casca provisória da lista (A3): guarda os filtros na URL. A ficha ao lado entra no A4.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { filtersQuery, type PeopleFilters } from "../domain";
import { createPersonAction } from "../actions";
import type { PersonListItem } from "../types";
import { PeopleList } from "./PeopleList";

export function PeopleBrowser({ people, groups, initial, canEdit }: { people: PersonListItem[]; groups: { id: string; name: string }[]; initial: PeopleFilters; canEdit: boolean }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initial);
  const [creating, setCreating] = useState(false);

  function apply(next: Partial<PeopleFilters>) {
    const f = { ...filters, ...next };
    setFilters(f);
    const qs = filtersQuery(f);
    window.history.replaceState(null, "", qs ? `/people?${qs}` : "/people");
  }
  async function create() {
    setCreating(true);
    const r = await createPersonAction();
    if (r.success) router.push(`/people/${r.data.id}`);
    else setCreating(false);
  }

  return <PeopleList people={people} groups={groups} filters={filters} onFilters={apply} selectedId={null} onSelect={(id) => router.push(`/people/${id}`)} onNew={create} canEdit={canEdit} creating={creating} />;
}
