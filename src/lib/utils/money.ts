// Formatação de dinheiro. Portada de format.js — a moeda vem da org (não de um
// global mutável): passe a currency explicitamente.
export function money(n: number, currency: string): string {
  const loc = currency === "USD" ? "en-US" : "pt-BR";
  return new Intl.NumberFormat(loc, { style: "currency", currency }).format(n || 0);
}

export function moneyShort(n: number, currency: string): string {
  const sym = currency === "USD" ? "$" : "R$";
  const a = Math.abs(n);
  if (a >= 1000) return sym + " " + (n / 1000).toFixed(a >= 10000 ? 0 : 1).replace(".0", "") + "k";
  return sym + " " + Math.round(n);
}

// Interpreta o que o usuário digitou num campo de dinheiro → valor numérico (unidades
// da moeda). Regra (roadmap #4): SEM separador decimal, os dígitos são centavos
// ("123456" → 1234,56); COM separador, é um número decimal ("1234,5" → 1234,50). O
// separador decimal é "," em BRL e "." em USD; o outro conta como milhar e é ignorado.
// Devolve null quando não há dígitos. Idempotente sobre a saída de `money()`.
export function parseMoneyInput(raw: string, currency: string): number | null {
  const dec = currency === "USD" ? "." : ",";
  const cleaned = (raw || "").replace(/[^\d.,]/g, "");
  if (!cleaned.replace(/\D/g, "")) return null;
  if (cleaned.includes(dec)) {
    const idx = cleaned.lastIndexOf(dec);
    const intPart = cleaned.slice(0, idx).replace(/\D/g, "");
    const fracPart = (cleaned.slice(idx + 1).replace(/\D/g, "") + "00").slice(0, 2);
    const val = Number(intPart || "0") + Number(fracPart) / 100;
    return Number.isFinite(val) ? val : null;
  }
  const digits = cleaned.replace(/\D/g, "");
  return Number(digits) / 100;
}
