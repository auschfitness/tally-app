// Modelos de Settings. FONTE DA VERDADE POR CAMPO (ver README + handoff):
//  - orgName/currency → `organizations` (tabela)
//  - campuses         → `campuses` (tabela)
//  - userName         → `profiles.full_name` (tabela, do usuário logado)
//  - institution.*    → blob `app_state.data.institution` (só multiInstituição/lista)
//  - account.*        → blob `app_state.data.account` (idioma/fuso)
// Categorias/fundos de finança NÃO estão aqui: são relacionais (finance_*), geridos
// na feature Finance. Tema fica no Topbar (ThemeToggle), não em Settings.

export interface InstitutionConfig {
  multiInstitution: boolean;
  institutions: string[]; // nomes das instituições (multi-instituição), no blob
}

export interface AccountConfig {
  language: string;
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
  isOwner: boolean;
}
