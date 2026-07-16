// Configuração de i18n. Idioma é POR USUÁRIO (coluna `profiles.locale`, CHECK aceita
// só estes 3 valores; default pt-BR). Ver docs/handoffs/ui-fixes-i18n.md.
export const LOCALES = ["pt-BR", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

// Rótulos exibidos no seletor (cada um no próprio idioma).
export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "Português (BR)",
  en: "English",
  es: "Español",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function normalizeLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
