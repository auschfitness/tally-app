// Texto das páginas de impressão (spec 13, B4): ficha cadastral e certificado de batismo.
// Puro, para testar sem React.
import { brDate } from "@/lib/utils/date";
import { FIELD_META, ageLabel, formatCpf, formatPhone, longDate, optionLabel, ROLE_OPTIONS, type PersonField } from "./domain";
import type { PersonDetail } from "./types";

export interface Church {
  name: string;
  city: string;
  state: string;
}

export interface SheetSection {
  title: string;
  rows: [label: string, value: string][];
}

function display(field: PersonField, value: string): string {
  const meta = FIELD_META[field] as { kind: string; options?: readonly (readonly [string, string])[] };
  if (!value) return "";
  if (meta.kind === "select") return optionLabel(meta.options ?? [], value);
  if (meta.kind === "date") return brDate(value);
  if (meta.kind === "cpf") return formatCpf(value);
  if (field === "phone" || field === "whatsapp") return formatPhone(value);
  return value;
}

const place = (city: string, state: string): string => [city, state].filter(Boolean).join("/");

// Seções da ficha, só com o que está preenchido (a assinatura e a data ficam na página).
export function fichaSections(d: PersonDetail, now: Date): SheetSection[] {
  const v = d.values;
  const pick = (fields: PersonField[]): [string, string][] =>
    fields.flatMap((f) => (v[f] ? [[FIELD_META[f].label, display(f, v[f])] as [string, string]] : []));

  const birth = v.birthDate ? [brDate(v.birthDate), ageLabel(v.birthDate, now)].filter(Boolean).join(" · ") : "";
  const personal: [string, string][] = [
    ...(birth ? [[FIELD_META.birthDate.label, birth] as [string, string]] : []),
    ...pick(["gender", "maritalStatus", "profession"]),
  ];

  const own = [[v.line1, v.line2].filter(Boolean).join(", "), place(v.city, v.state), v.postalCode].filter(Boolean).join(" · ");
  const f = d.family;
  const famAddr = f ? [[f.line1, f.line2].filter(Boolean).join(", "), place(f.city, f.state), f.postalCode].filter(Boolean).join(" · ") : "";
  const address: [string, string][] = own ? [["Endereço", own]] : famAddr ? [["Endereço", `${famAddr} (endereço da família)`]] : [];

  const family: [string, string][] = f ? f.members.map((m) => [optionLabel(ROLE_OPTIONS, m.role), m.name] as [string, string]) : [];

  const sections: SheetSection[] = [
    { title: "Contato", rows: pick(["phone", "whatsapp", "email"]) },
    { title: "Dados pessoais", rows: personal },
    { title: "Documentos", rows: pick(["cpf", "rg"]) },
    { title: "Endereço", rows: address },
    { title: f ? f.name || "Família" : "Família", rows: family },
    { title: "Vida na igreja", rows: pick(["status", "firstVisit", "conversionDate", "baptismDate", "admissionType", "membershipDate", "office", "exitDate", "exitReason"]) },
  ];
  return sections.filter((s) => s.rows.length > 0);
}

// "Certificamos que <nome> foi batizado(a) nas águas em <data>, na <igreja>, em <cidade>/<UF>."
// Devolve em partes para o nome sair em destaque.
export function baptismText(name: string, gender: string, date: string, church: Church): { before: string; name: string; after: string } {
  const verb = gender === "male" ? "batizado" : gender === "female" ? "batizada" : "batizado(a)";
  const where = place(church.city, church.state);
  const churchPart = church.name ? `, na ${church.name}` : "";
  return {
    before: "Certificamos que",
    name,
    after: `foi ${verb} nas águas em ${longDate(date)}${churchPart}${where ? `, em ${where}` : ""}.`,
  };
}
