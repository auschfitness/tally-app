import { requireOrg } from "@/lib/auth/session";
import { listPrayers } from "@/features/prayer/queries";
import { PrayerBoard } from "@/features/prayer/components/PrayerBoard";

// Mural de Oração (Server Component): busca no servidor (RLS por org), entrega ao
// board interativo (nuvem, filtro, lista). Mutações via Server Actions.
export default async function PrayerPage() {
  const { supabase, user, orgId } = await requireOrg();
  const prayers = await listPrayers(supabase, orgId);
  const authorDefault = user.email?.split("@")[0] ?? "";

  return <PrayerBoard prayers={prayers} authorDefault={authorDefault} />;
}
