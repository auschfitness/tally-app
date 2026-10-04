// Callback de OAuth / confirmação de e-mail: troca o `code` por uma sessão e
// grava os cookies (padrão SSR). Depois manda para o destino (default: início).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const fallback = next === "/redefinir-senha" ? "/redefinir-senha?expired=1" : "/login";
  return NextResponse.redirect(`${origin}${fallback}`);
}
