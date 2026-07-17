"use client";

// Seletor de campus do topo. Troca o campus ativo (cookie global via Server Action)
// e atualiza toda a tela. Com um único campus, mostra só o contexto (sem troca).
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveCampusAction } from "./campus-actions";

export function CampusSwitcher({ campuses, activeCampus }: { campuses: string[]; activeCampus: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (campuses.length === 0) return null;
  if (campuses.length === 1) {
    return (
      <div className="pillsel">
        <button className="on" type="button" disabled>{campuses[0]}</button>
      </div>
    );
  }

  function pick(name: string) {
    if (name === activeCampus || pending) return;
    startTransition(async () => {
      await setActiveCampusAction(name);
      router.refresh();
    });
  }

  return (
    <div className="pillsel" aria-busy={pending}>
      {campuses.map((c) => (
        <button
          key={c}
          className={c === activeCampus ? "on" : ""}
          type="button"
          disabled={pending}
          aria-pressed={c === activeCampus}
          onClick={() => pick(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
