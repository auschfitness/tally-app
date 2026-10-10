// Exportar a lista de pessoas em CSV para o Excel brasileiro (spec 13, B2): separador `;`,
// UTF-8 com BOM, cabeçalhos em português. CPF e RG só entram quando `withDocs`.
import { brDate } from "@/lib/utils/date";
import { formatCpf, formatPhone, optionLabel, GENDER_OPTIONS, MARITAL_OPTIONS, relLabel, type Relationship } from "./domain";

export interface ExportPerson {
  name: string;
  status: Relationship;
  office: string;
  phone: string;
  whatsapp: string;
  email: string;
  birthDate: string | null;
  gender: string;
  maritalStatus: string;
  profession: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  baptismDate: string | null;
  membershipDate: string | null;
  cpf: string;
  rg: string;
}

// Célula entre aspas quando precisa; texto que começaria uma fórmula no Excel ganha apóstrofo.
export function csvCell(v: string): string {
  const safe = /^[=@\t\r]|^[+-][^\d\s()]/.test(v) ? `'${v}` : v;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function peopleCsv(people: ExportPerson[], withDocs: boolean): string {
  const cols: [string, (p: ExportPerson) => string][] = [
    ["Nome", (p) => p.name],
    ["Situação", (p) => relLabel(p.status)],
    ["Cargo", (p) => p.office],
    ["Telefone", (p) => (p.phone ? formatPhone(p.phone) : "")],
    ["WhatsApp", (p) => (p.whatsapp ? formatPhone(p.whatsapp) : "")],
    ["E-mail", (p) => p.email],
    ["Nascimento", (p) => brDate(p.birthDate)],
    ["Sexo", (p) => optionLabel(GENDER_OPTIONS, p.gender)],
    ["Estado civil", (p) => optionLabel(MARITAL_OPTIONS, p.maritalStatus)],
    ["Profissão", (p) => p.profession],
    ["Endereço", (p) => p.line1],
    ["Bairro ou complemento", (p) => p.line2],
    ["Cidade", (p) => p.city],
    ["UF", (p) => p.state],
    ["CEP", (p) => p.postalCode],
    ["Batismo", (p) => brDate(p.baptismDate)],
    ["Membro desde", (p) => brDate(p.membershipDate)],
  ];
  if (withDocs) cols.push(["CPF", (p) => (p.cpf ? formatCpf(p.cpf) : "")], ["RG", (p) => p.rg]);
  const lines = [cols.map(([h]) => h), ...people.map((p) => cols.map(([, get]) => get(p)))];
  return "\uFEFF" + lines.map((l) => l.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
