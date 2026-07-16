// Carregador de dicionário por locale. Server-side: a page/layout chama
// getDictionary(locale) e passa as strings prontas para os componentes (as folhas
// não importam dicionário). Ver docs/handoffs/ui-fixes-i18n.md.
import type { Locale } from "./config";
import { ptBR, type Dictionary } from "./dictionaries/pt-BR";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";

const DICTS: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en,
  es,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale];
}

export type { Dictionary };
