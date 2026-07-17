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

// "Hoje" (YYYY-MM-DD) no fuso IANA dado — robusto no SSR (o servidor da Vercel roda
// em UTC, então `today()` cruza a meia-noite antes do usuário no Brasil/EUA e
// destaca o dia errado). Usa Intl no fuso da organização. Fuso inválido → cai para
// a data local do servidor (comportamento antigo).
export function zonedTodayIso(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fuso inválido → fallback
  }
  return isoDate(today());
}

// Máscara progressiva de dígitos em "dd/mm/aaaa" (para o campo de data PT-BR).
export function maskBrDate(raw: string): string {
  const d = (raw || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}

// "dd/mm/aaaa" -> "aaaa-mm-dd" (ISO). String vazia se incompleta ou data inválida.
export function brToIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((br || "").trim());
  if (!m) return "";
  const dd = +m[1]!, mm = +m[2]!, yyyy = +m[3]!;
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((x) => x[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function isThisMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso), n = today();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  return Math.floor((today().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
