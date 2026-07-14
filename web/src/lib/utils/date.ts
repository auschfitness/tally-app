// Utilidades de data/texto puras (sem estado). Portadas de src/core/helpers.js
// preservando o comportamento (semana = 7 dias; rótulos em PT-BR).

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Semanas inteiras desde uma data ISO. Sem data → 999 (tratado como "há muito").
export function weeksSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  const diff = (today().getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff / 7);
}

export function agoLabel(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const d = Math.round((today().getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (d <= 0) return "hoje";
  if (d < 7) return "há " + d + " dia" + (d > 1 ? "s" : "");
  const w = Math.floor(d / 7);
  return "há " + w + " semana" + (w > 1 ? "s" : "");
}

// "2024-03-09" -> "09/03/2024"
export function brDate(iso: string | null | undefined): string {
  return iso ? iso.split("-").reverse().join("/") : "";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((x) => x[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  return Math.floor((today().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
