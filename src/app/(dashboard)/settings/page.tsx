import { requireOrg } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n";
import { loadSettings, loadFiscal } from "@/features/settings/queries";
import { canManageFiscal } from "@/features/settings/access";
import { SettingsView } from "@/features/settings/components/SettingsView";

// Configurações (Server Component). Cada campo vem da sua fonte da verdade
// (organizations/campuses/profiles = tabela; institution/account = blob app_state).
// O idioma (profiles.locale) escolhe o dicionário i18n, resolvido no SSR e passado
// pronto às folhas. Ver docs/handoffs/settings-supabase.md e ui-fixes-i18n.md.
export default async function SettingsPage() {
  const ctx = await requireOrg();
  const { supabase, orgId, user, isOwner } = ctx;
  const [data, fiscal] = await Promise.all([
    loadSettings(supabase, orgId, user.id),
    loadFiscal(supabase, orgId),
  ]);
  const dict = getDictionary(data.locale);
  return <SettingsView data={{ ...data, isOwner, fiscal, canManageFiscal: canManageFiscal(ctx) }} dict={dict} />;
}
