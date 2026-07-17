// Domínio Oração. Regras portadas 1:1 de derived.js (prayerCloudData/prayerMatch/
// ansLeft) e da regra de prune (+30 dias). Interface pública desta feature.
import { today } from "@/lib/utils/date";

export type Privacy = "church" | "group" | "leader" | "private";

export const PRIVACY_LABELS: Record<Privacy, string> = {
  church: "Igreja toda",
  group: "Só o grupo",
  leader: "Só líderes",
  private: "Reservado",
};

export const PRIVACY_OPTIONS: ReadonlyArray<readonly [Privacy, string]> = [
  ["church", "Igreja toda"],
  ["group", "Só o grupo"],
  ["leader", "Só líderes"],
];

// Motivos de oração sugeridos (roadmap #3) — o "Novo pedido" oferece esta lista +
// "adicionar novo tema". Gravados em prayer_requests.topics (coluna já existe).
export const PRAYER_TOPICS: readonly string[] = [
  "Saúde",
  "Família",
  "Casamento",
  "Filhos",
  "Finanças",
  "Trabalho",
  "Vida espiritual",
  "Libertação",
  "Cura emocional",
  "Ansiedade",
  "Luto",
  "Relacionamentos",
  "Estudos",
  "Ministério",
  "Outros",
];

export interface PrayerRequest {
  id: string;
  title: string;
  author: string;
  request: string;
  privacy: Privacy;
  group: string;
  topics: string[];
  praying: number;
  answered: boolean;
  answeredDate: string | null;
  date: string;
}

export type CloudCategory = "topic" | "group" | "name";
export interface CloudWord {
  text: string;
  cat: CloudCategory;
  count: number;
}
export interface CloudFilter {
  cat: CloudCategory;
  val: string;
}

// "Foco de Oração": agrega temas, grupos e autores (≠ Anônimo) dos pedidos NÃO
// respondidos, por frequência. Top 28. (prayerCloudData de derived.js.)
export function prayerCloudData(prayers: PrayerRequest[]): CloudWord[] {
  const m = new Map<string, CloudWord>();
  const add = (text: string, cat: CloudCategory) => {
    if (!text) return;
    const k = cat + "|" + text;
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { text, cat, count: 1 });
  };
  for (const p of prayers) {
    if (p.answered) continue;
    for (const t of p.topics) add(t, "topic");
    if (p.group) add(p.group, "group");
    if (p.author && p.author !== "Anônimo") add(p.author, "name");
  }
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 28);
}

export function prayerMatch(p: PrayerRequest, f: CloudFilter | null): boolean {
  if (!f) return true;
  if (f.cat === "topic") return p.topics.includes(f.val);
  if (f.cat === "group") return p.group === f.val;
  if (f.cat === "name") return p.author === f.val;
  return true;
}

function daysSince(iso: string): number {
  return (today().getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// Respondidas sem answered_on nunca somem. Com data: some 30 dias depois.
export function isPrunable(p: PrayerRequest): boolean {
  return p.answered && !!p.answeredDate && daysSince(p.answeredDate) >= 30;
}

// "some em N dias" (contagem regressiva do prune). ansLeft de derived.js.
export function ansLeft(p: PrayerRequest): string {
  if (!p.answeredDate) return "";
  const d = Math.ceil(30 - daysSince(p.answeredDate));
  return d > 0 ? "some em " + d + " dia" + (d > 1 ? "s" : "") : "some em breve";
}
