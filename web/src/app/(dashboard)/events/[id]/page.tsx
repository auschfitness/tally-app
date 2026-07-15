import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { relLabel } from "@/features/sticks/domain";
import { listEvents, listEventRegistrations } from "@/features/events/queries";
import { STATUS_LBL, whenLabel } from "@/features/events/domain";
import { EditEventButton, RegisterButton } from "@/features/events/components/EventTools";
import { RegistrationsList, type RegRow } from "@/features/events/components/RegistrationsList";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
}) {
  const { id } = await params;
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [events, regs, people, campusRes] = await Promise.all([
    listEvents(supabase, orgId),
    listEventRegistrations(supabase, orgId, id),
    listSticks(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : event.campus || campuses[0] || "";

  const personById = new Map(people.map((p) => [p.id, p]));
  const rows: RegRow[] = regs.map((r) => {
    const p = r.stick_id ? personById.get(r.stick_id) : undefined;
    return {
      id: r.id,
      name: p ? p.name : r.name || "—",
      tag: p ? relLabel(p.relationship) : "Visitante",
      isStick: !!p,
      contact: [r.email, r.phone].filter(Boolean).join(" · "),
      checked_in: r.checked_in,
    };
  });
  const checked = rows.filter((r) => r.checked_in).length;

  // Disponíveis para inscrever: Sticks (não arquivadas — já filtrado em listSticks)
  // que ainda não estão inscritas. Não filtra por campus (igual ao legado).
  const already = new Set(regs.map((r) => r.stick_id).filter((x): x is string => !!x));
  const available = people
    .filter((p) => !already.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, label: `${p.name} (${relLabel(p.relationship)})` }));

  const flags: string[] = [];
  if (event.registration_required) flags.push("Inscrição obrigatória");
  if (event.check_in_enabled) flags.push("Check-in ativo");
  if (event.payment_required) flags.push("Pagamento (interno)");

  return (
    <>
      <Link href="/events" className="link">← Voltar aos eventos</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{event.name || "(sem nome)"}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {whenLabel(event)}{event.type ? ` · ${event.type}` : ""} · {STATUS_LBL[event.status] || event.status}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <EditEventButton event={event} campuses={campuses} activeCampus={activeCampus} />
          <RegisterButton eventId={event.id} people={available} />
        </div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph">
            <h3>Inscrições</h3>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {regs.length} inscrito{regs.length !== 1 ? "s" : ""}{checked ? ` · ${checked} presente${checked !== 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <RegistrationsList eventId={event.id} rows={rows} />
        </div>
        <div className="panel">
          <div className="ph"><h3>Sobre o evento</h3></div>
          <div className="field"><label>Quando</label><div>{whenLabel(event)}</div></div>
          {event.location ? <div className="field"><label>Local</label><div>{event.location}</div></div> : null}
          {event.campus ? <div className="field"><label>Campus</label><div>{event.campus}</div></div> : null}
          {event.capacity ? <div className="field"><label>Capacidade</label><div>{regs.length} / {event.capacity}</div></div> : null}
          {flags.length ? <div className="field"><label>Configuração</label><div>{flags.join(" · ")}</div></div> : null}
          {event.description ? <div className="field"><label>Sobre</label><div>{event.description}</div></div> : null}
        </div>
      </div>
    </>
  );
}
