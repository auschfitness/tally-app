// Suporte a testes de INTEGRAÇÃO. Cria um cliente Supabase autenticado como um
// USUÁRIO DE TESTE (fixture provido pelo orquestrador: TALLY_TEST_EMAIL/PASSWORD
// numa org de teste semeada). Sem a fixture, os testes de integração se auto-pulam
// (describe.skipIf(!hasTestFixture)) — a suíte segue determinística e offline.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.TALLY_TEST_EMAIL;
const password = process.env.TALLY_TEST_PASSWORD;

export const hasTestFixture = Boolean(url && anon && email && password);

// Faz login e devolve o cliente + org_id do usuário de teste (derivado no servidor
// via memberships, como em produção). Lança se a fixture não estiver configurada.
export async function signInTestUser(): Promise<{ supabase: SupabaseClient<Database>; orgId: string }> {
  if (!hasTestFixture) throw new Error("Fixture de teste ausente (TALLY_TEST_EMAIL/PASSWORD).");
  const supabase = createClient<Database>(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: email!, password: password! });
  if (error) throw new Error("Login do usuário de teste falhou: " + error.message);

  const { data, error: mErr } = await supabase.from("memberships").select("org_id").limit(1).maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!data) throw new Error("Usuário de teste sem membership/org.");
  return { supabase, orgId: data.org_id };
}
