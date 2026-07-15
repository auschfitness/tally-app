import { requireOrg } from "@/lib/auth/session";
import { loadSettings } from "@/features/settings/queries";
import { SettingsView } from "@/features/settings/components/SettingsView";

// Configurações (Server Component). Cada campo vem da sua fonte da verdade
// (organizations/campuses/profiles = tabela; institution/account = blob app_state).
// Ver docs/handoffs/settings-supabase.md e o README da feature.
export default async function SettingsPage() {
  const { supabase, orgId, user, isOwner } = await requireOrg();
  const data = await loadSettings(supabase, orgId, user.id);
  return <SettingsView data={{ ...data, isOwner }} />;
}
