import { requireOrg, can } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n";
import { loadSettings, loadFiscal } from "@/features/settings/queries";
import { canManageFiscal } from "@/features/settings/access";
import { resolveAdminTab, visibleAdminTabs } from "@/features/settings/domain";
import { loadMembers, loadRoles } from "@/features/roles/queries";
import { listInvites } from "@/features/invites/queries";
import { SettingsView } from "@/features/settings/components/SettingsView";

// Administração da igreja (Server Component). Consolida Geral, Cargos e permissões,
// Jurídico/Fiscal e Membros e convites num só hub de abas — cada uma gated pela permissão
// certa (abas que o usuário não pode ver nem aparecem). É reorganização de front: reusa as
// features existentes (settings/roles/invites) sem reescrever lógica. A rota segue
// /settings, então os revalidatePath("/settings") das actions continuam válidos. ?tab=
// deep-linka a aba; quem só tem uma permissão entra direto na aba que pode ver.
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireOrg();
  const { supabase, orgId, user, isOwner } = ctx;

  const canManageMembers = can(ctx, "members.manage");
  const perms = {
    canManageOrg: can(ctx, "org.manage"),
    canManageMembers,
    canManageFiscal: canManageFiscal(ctx),
  };

  // Base (Geral + Conta) e Jurídico são leitura de qualquer membro; Cargos/Membros só
  // carregam quando o usuário gerencia membros (senão nem tem a aba). RLS é a barreira real.
  const [base, fiscal] = await Promise.all([loadSettings(supabase, orgId, user.id), loadFiscal(supabase, orgId)]);
  const [roles, members, invites] = canManageMembers
    ? await Promise.all([
        loadRoles(supabase, orgId),
        loadMembers(supabase, orgId, user.id),
        listInvites(supabase, orgId, new Date().toISOString()),
      ])
    : [[], [], []];

  const visibleTabs = visibleAdminTabs(perms);
  const { tab } = await searchParams;
  const initialTab = resolveAdminTab(tab, visibleTabs);

  const dict = getDictionary(base.locale);
  const team = { roles, members, canManage: canManageMembers };
  const data = { ...base, isOwner, fiscal, canManageFiscal: perms.canManageFiscal, team };

  return <SettingsView data={data} dict={dict} visibleTabs={visibleTabs} initialTab={initialTab} invites={invites} />;
}
