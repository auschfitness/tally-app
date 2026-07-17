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
import type { TeamData } from "@/features/roles/types";
import type { FiscalProfile } from "./fiscal";

export interface FiscalData {
  org: FiscalProfile; // dados fiscais da matriz (org_fiscal_profiles)
  byCampus: Record<string, FiscalProfile>; // por campus (campus_fiscal_profiles), chave = campus_id
  campuses: CampusRow[]; // campi ativos, para o seletor de entidade
}

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
  active: boolean; // desativado = fora do seletor/filtros, mas preserva o histórico
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
  fiscal: FiscalData; // dados jurídicos (matriz + filiais)
  canManageFiscal: boolean; // pode editar dados jurídicos (dono/pastor/tesoureiro)
  team: TeamData; // equipe e cargos (feature roles) — gated por members.manage
}
