import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { signals } from "@/features/signals/domain";
import { buildSignalsInput, loadOverrides } from "@/features/inbox/queries";
import { visibleSignals } from "@/features/inbox/domain";
import { InboxFeed } from "@/features/inbox/components/InboxFeed";

// Inbox (Server Component). Fonte: engine ao vivo + `signal_overrides` (NÃO a tabela
// `signals`). Monta o SignalsInput reusando as queries das features, calcula os
// Signals com `now` injetado e envia só os VISÍVEIS (fora dispensados/adiados/
// atribuídos) para o Client filtrar por categoria. Ver docs/handoffs/inbox-supabase.md.
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const campusRes = await supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name");
  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);

  const [input, overrides] = await Promise.all([buildSignalsInput(supabase, orgId, activeCampus), loadOverrides(supabase, orgId)]);
  const all = signals(input, new Date());
  const visible = visibleSignals(all, overrides);

  return <InboxFeed signals={visible} />;
}
