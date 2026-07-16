// Consultas de Settings. Cada campo vem da SUA fonte da verdade (tabela vs. blob).
// RLS: organizations/campuses/app_state = is_org_member; profiles = do próprio user.
// Ver docs/handoffs/settings-supabase.md.
import type { DB } from "@/lib/auth/session";
import { normalizeLocale, type Locale } from "@/lib/i18n/config";
import { readAccount, readInstitution } from "./domain";
import type { AccountConfig, CampusRow, InstitutionConfig } from "./types";

export interface SettingsLoad {
  orgName: string;
  currency: string;
  campuses: CampusRow[];
  institution: InstitutionConfig;
  account: AccountConfig;
  userName: string;
  locale: Locale; // idioma do usuário (profiles.locale), fonte da verdade do i18n
}

export async function loadSettings(supabase: DB, orgId: string, userId: string): Promise<SettingsLoad> {
  const [orgRes, campusRes, stateRes, profRes] = await Promise.all([
    supabase.from("organizations").select("name, currency").eq("id", orgId).maybeSingle(),
    supabase.from("campuses").select("id, name").eq("org_id", orgId).order("name"),
    supabase.from("app_state").select("data").eq("org_id", orgId).maybeSingle(),
    supabase.from("profiles").select("full_name, locale").eq("id", userId).maybeSingle(),
  ]);

  const blob = stateRes.data?.data;
  return {
    orgName: orgRes.data?.name ?? "",
    currency: orgRes.data?.currency ?? "BRL",
    campuses: (campusRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    institution: readInstitution(blob),
    account: readAccount(blob),
    userName: profRes.data?.full_name ?? "",
    locale: normalizeLocale(profRes.data?.locale),
  };
}
