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
