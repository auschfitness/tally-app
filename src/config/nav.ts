// Navegação principal. Onda 2 / Fatia B: os itens agora ficam agrupados por
// domínio (arquitetura de informação), mas as ROTAS e os RÓTULOS de produto são
// preservados — aqui só reorganizamos o menu, nunca renomeamos termos do CLAUDE.md.
// `key` = feature; `href` = rota no App Router; `count` marca itens com contador.
export interface NavItem {
  key: string;
  label: string;
  href: string;
  count?: "inbox" | "people" | "tasks";
}

// Um grupo colapsável do menu (um domínio). `key` identifica o grupo para
// persistir aberto/fechado; `label` é o cabeçalho quieto (não é rota).
export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

// Itens soltos no topo (sem grupo): as duas superfícies de uso diário.
export const TOP_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Home", href: "/" },
  { key: "inbox", label: "Inbox", href: "/inbox", count: "inbox" },
];

// Grupos por domínio. Um item ativo por vez; grupos revelam-se sob demanda.
// Sem reintroduzir campus e sem renomear termos de produto (Stick/Care/Journey...).
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "pessoas",
    label: "Pessoas",
    items: [
      { key: "people", label: "Sticks", href: "/sticks", count: "people" },
      { key: "groups", label: "Saúde dos Grupos", href: "/groups" },
      { key: "teams", label: "Times", href: "/teams" },
      { key: "coord", label: "Coordenação", href: "/coordination", count: "tasks" },
      { key: "journey", label: "Journey", href: "/journey" },
      { key: "study", label: "Trilhas", href: "/tracks" },
    ],
  },
  {
    key: "encontros",
    label: "Encontros",
    items: [
      { key: "services", label: "Cultos", href: "/services" },
      { key: "events", label: "Eventos", href: "/events" },
      { key: "calendar", label: "Agenda", href: "/calendar" },
    ],
  },
  {
    key: "cuidado",
    label: "Cuidado",
    items: [
      { key: "care", label: "Care", href: "/care" },
      { key: "prayer", label: "Oração", href: "/prayer" },
    ],
  },
  {
    key: "ensino",
    label: "Ensino",
    items: [{ key: "sermons", label: "Estudo", href: "/study" }],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    items: [
      { key: "finance", label: "Finance Lite", href: "/finance" },
      { key: "giving", label: "Doações", href: "/giving" },
    ],
  },
  {
    key: "comunicacao",
    label: "Comunicação",
    // Comunicação = hub de espaços (estilo Basecamp). O fluxo antigo de e-mail
    // (/communication compor/preparar/"Enviar agora") continua no código, mas sai do
    // menu — a nav "Comunicação" agora aponta para /spaces.
    items: [{ key: "spaces", label: "Comunicação", href: "/spaces" }],
  },
];

export const SETTINGS_ITEM: NavItem = { key: "settings", label: "Configurações", href: "/settings" };
