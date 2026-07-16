// Barrel do i18n — só o que é seguro no cliente (config puro + dicionários = dados
// puros). `getLocale` (SSR, usa Supabase) importa de "./locale"; `setLocaleAction`
// de "./actions" (Server Action). Assim o bundle do cliente não puxa código de
// servidor.
export { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS, isLocale, normalizeLocale, type Locale } from "./config";
export { getDictionary, type Dictionary } from "./dictionaries";
