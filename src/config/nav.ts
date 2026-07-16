// Navegação principal (espelha a sidebar do app atual, na mesma ordem e rótulos).
// `key` = feature; `href` = rota no App Router; `count` marca itens com contador.
export interface NavItem {
  key: string;
  label: string;
  href: string;
  count?: "inbox" | "people" | "tasks";
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Home", href: "/" },
  { key: "inbox", label: "Inbox", href: "/inbox", count: "inbox" },
  { key: "people", label: "Sticks", href: "/sticks", count: "people" },
  { key: "care", label: "Care", href: "/care" },
  { key: "journey", label: "Journey", href: "/journey" },
  { key: "groups", label: "Saúde dos Grupos", href: "/groups" },
  { key: "teams", label: "Times", href: "/teams" },
  { key: "services", label: "Cultos", href: "/services" },
  { key: "events", label: "Eventos", href: "/events" },
  { key: "calendar", label: "Agenda", href: "/calendar" },
  { key: "study", label: "Trilhas", href: "/tracks" },
  { key: "sermons", label: "Estudo", href: "/study" },
  { key: "coord", label: "Coordenação", href: "/coordination", count: "tasks" },
  { key: "prayer", label: "Oração", href: "/prayer" },
  { key: "finance", label: "Finance Lite", href: "/finance" },
];

export const SETTINGS_ITEM: NavItem = { key: "settings", label: "Configurações", href: "/settings" };
