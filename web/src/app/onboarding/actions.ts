"use server";

// Cria a igreja (org + membership owner + campus + app_state) atomicamente via a
// RPC create_org. Autorização: exige usuário autenticado; a RPC usa auth.uid().
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { initialAppState } from "@/lib/initial-state";

export type OnboardingState = { error: string | null };

const CURRENCIES = new Set(["BRL", "USD"]);

export async function createOrgAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  const campus = String(formData.get("campus") ?? "").trim() || "Sede";
  const currencyRaw = String(formData.get("currency") ?? "BRL");
  const currency = CURRENCIES.has(currencyRaw) ? currencyRaw : "BRL";

  if (!name) return { error: "Dê um nome à igreja." };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_org", {
    p_name: name,
    p_currency: currency,
    p_campus: campus,
    p_state: initialAppState(name, campus, currency),
  });

  if (error) return { error: error.message };

  redirect("/");
}
