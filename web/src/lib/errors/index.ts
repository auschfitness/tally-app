// Resultado padrão de Server Actions (spec §Server Actions). Discriminated union:
// a UI checa `success` e recebe dados tipados ou erros de campo estruturados.
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function done(): ActionResult {
  return { success: true, data: undefined };
}

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, message, fieldErrors };
}

// Mensagem amigável a partir de um erro do Supabase/desconhecido, sem vazar
// detalhe técnico para a UI (o detalhe vai só para o log do servidor).
export function toMessage(error: unknown, fallback = "Algo deu errado. Tente de novo."): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}
