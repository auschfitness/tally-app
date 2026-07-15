"use client";

// Lista de inscrições do evento (Client — Server Actions): check-in (toggle) e
// remover. Check-in aqui = event_registrations.checked_in (fluxo próprio do evento),
// não presença genérica (lib/attendance).
import { useRouter } from "next/navigation";
import { removeRegistrationAction, toggleCheckInAction } from "../actions";
import { initials } from "@/lib/utils/date";

export interface RegRow {
  id: string;
  name: string;
  tag: string;
  isStick: boolean;
  contact: string;
  checked_in: boolean;
}

export function RegistrationsList({ eventId, rows }: { eventId: string; rows: RegRow[] }) {
  const router = useRouter();

  async function confirmRemove(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remover esta inscrição?")) {
      e.preventDefault();
      return;
    }
    setTimeout(() => router.refresh(), 400);
  }

  if (rows.length === 0) {
    return <div className="empty">Ninguém inscrito ainda. Use “Inscrever”.</div>;
  }

  return (
    <>
      {rows.map((r) => (
        <div className="li" key={r.id}>
          <div className={`av${r.checked_in ? "" : " c"}`}>{initials(r.name || "?")}</div>
          <div style={{ flex: 1 }}>
            <div><b>{r.name}</b> <span className={`chip ${r.isStick ? "member" : "visitor"}`}>{r.tag}</span></div>
            {r.contact ? <div className="meta">{r.contact}</div> : null}
          </div>
          <div className="right">
            <form action={toggleCheckInAction} style={{ display: "inline" }} onSubmit={() => setTimeout(() => router.refresh(), 400)}>
              <input type="hidden" name="regId" value={r.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="on" value={r.checked_in ? "0" : "1"} />
              <button className="btn ghost sm" type="submit">{r.checked_in ? "Presente ✓" : "Check-in"}</button>
            </form>
            <form action={removeRegistrationAction} style={{ display: "inline" }} onSubmit={confirmRemove}>
              <input type="hidden" name="regId" value={r.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <button className="link" type="submit">remover</button>
            </form>
          </div>
        </div>
      ))}
    </>
  );
}
