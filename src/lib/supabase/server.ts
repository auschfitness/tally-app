// Cliente Supabase do SERVIDOR (Server Components, Server Actions, Route
// Handlers). Lê/escreve a sessão nos cookies via @supabase/ssr. É o cliente
// padrão para dados privados: a sessão é validada no servidor, não no navegador.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component: a escrita de cookie é ignorada.
          // O middleware (updateSession) renova a sessão a cada request, então
          // isso é seguro — só não dá pra setar cookie fora de Action/Handler.
        }
      },
    },
  });
}
