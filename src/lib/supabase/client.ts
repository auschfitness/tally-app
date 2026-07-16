// Cliente Supabase do NAVEGADOR. Use só em Client Components que precisam de
// interação em tempo real (Realtime) ou de chamadas que não dá pra fazer no
// servidor. Para leituras/mutações privadas, prefira o cliente do servidor.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
