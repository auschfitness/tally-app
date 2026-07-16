// Modelos de Settings. FONTE DA VERDADE POR CAMPO (ver README + handoff):
//  - orgName/currency → `organizations` (tabela)
//  - campuses         → `campuses` (tabela)
//  - userName         → `profiles.full_name` (tabela, do usuário logado)
//  - institution.*    → blob `app_state.data.institution` (só multiInstituição/lista)
//  - account.timezone → blob `app_state.data.account` (fuso)
//  - locale (idioma)  → `profiles.locale` (tabela, por usuário) — NÃO é blob (i18n)
// Categorias/fundos de finança NÃO estão aqui: são relacionais (finance_*), geridos
// na feature Finance. Tema fica no Topbar (ThemeToggle), não em Settings.
import type { Locale } from "@/lib/i18n/config";

export interface InstitutionConfig {
  multiInstitution: boolean;
  institutions: string[]; // nomes das instituições (multi-instituição), no blob
}

export interface AccountConfig {
  timezone: string;
}

export interface CampusRow {
  id: string;
  name: string;
}

export interface SettingsData {
  orgName: string;
  currency: string;
  campuses: CampusRow[];
  institution: InstitutionConfig;
  account: AccountConfig;
  userName: string;
  locale: Locale;
  isOwner: boolean;
}
