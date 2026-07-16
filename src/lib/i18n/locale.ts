// Leitura do idioma do usuário logado no SSR. Fonte da verdade: `profiles.locale`
// (por usuário). Isolado atrás deste helper para manter as folhas limpas — nenhum
// componente lê a coluna direto. Sem sessão → default. Nunca lança (cai no default).
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_LOCALE;
    const { data } = await supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle();
    return normalizeLocale(data?.locale);
  } catch {
    return DEFAULT_LOCALE;
  }
}
