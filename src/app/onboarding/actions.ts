"use server";

// Cria a igreja (org + membership owner + campus + app_state) atomicamente via a
// RPC create_org. Autorização: exige usuário autenticado; a RPC usa auth.uid().
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { initialAppState } from "@/lib/initial-state";

export type OnboardingState = { error: string | null };

const CURRENCIES = new Set(["BRL", "USD"]);
const COUNTRIES = new Set(["BR", "US"]);

export async function createOrgAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  // Uma igreja = um local: não pedimos campus no cadastro. Criamos um "Sede" default
  // aqui (o banco ainda o exige) e a UI trata o financeiro/dados como da organização.
  const campus = "Sede";
  // O país escolhido no cadastro dita o resto (dados jurídicos BR/US). Depois é só leitura.
  const countryRaw = String(formData.get("country") ?? "BR");
  const country = COUNTRIES.has(countryRaw) ? countryRaw : "BR";
  const currencyRaw = String(formData.get("currency") ?? "BRL");
  const currency = CURRENCIES.has(currencyRaw) ? currencyRaw : "BRL";

  if (!name) return { error: "Dê um nome à igreja." };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_org", {
    p_name: name,
    p_currency: currency,
    p_campus: campus,
    p_country: country,
    p_state: initialAppState(name, campus, currency),
  });

  if (error) return { error: error.message };

  redirect("/");
}
