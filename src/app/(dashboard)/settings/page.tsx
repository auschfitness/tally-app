import { requireOrg } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n";
import { loadSettings } from "@/features/settings/queries";
import { SettingsView } from "@/features/settings/components/SettingsView";

// Configurações (Server Component). Cada campo vem da sua fonte da verdade
// (organizations/campuses/profiles = tabela; institution/account = blob app_state).
// O idioma (profiles.locale) escolhe o dicionário i18n, resolvido no SSR e passado
// pronto às folhas. Ver docs/handoffs/settings-supabase.md e ui-fixes-i18n.md.
export default async function SettingsPage() {
  const { supabase, orgId, user, isOwner } = await requireOrg();
  const data = await loadSettings(supabase, orgId, user.id);
  const dict = getDictionary(data.locale);
  return <SettingsView data={{ ...data, isOwner }} dict={dict} />;
}
