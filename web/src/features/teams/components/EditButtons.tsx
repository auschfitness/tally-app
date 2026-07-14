"use client";

// Gatilhos finos de edição (Client) montados em páginas Server: abrem os modais
// reutilizáveis de Time/Ministério em modo edição.
import { useState } from "react";
import { TeamModal } from "./TeamModal";
import { MinistryModal } from "./MinistryModal";
import type { Ministry, Team } from "../types";
import type { PersonOption } from "./types";

export function EditTeamButton({
  team,
  ministries,
  people,
  campuses,
  activeCampus,
}: {
  team: Team;
  ministries: Ministry[];
  people: PersonOption[];
  campuses: string[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>Editar time</button>
      {open ? (
        <TeamModal team={team} ministries={ministries} people={people} campuses={campuses} activeCampus={activeCampus} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

export function EditMinistryButton({
  ministry,
  people,
  activeCampus,
}: {
  ministry: Ministry;
  people: PersonOption[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>Editar ministério</button>
      {open ? (
        <MinistryModal ministry={ministry} people={people} activeCampus={activeCampus} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
