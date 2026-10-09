// Validação de um campo da ficha (fronteira da Server Action). Sem lib externa: as regras são
// poucas e explícitas. Função pura: devolve o texto canônico (o que a tela passa a mostrar) e o
// valor que vai para a coluna.
import { FIELD_META, formatCep, isValidCpf, onlyDigits, type PersonField } from "./domain";

export type FieldResult =
  | { ok: true; text: string; value: string | boolean | null }
  | { ok: false; error: string };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function realDate(iso: string): boolean {
  const m = ISO.exec(iso);
  if (!m) return false;
  const [y, mo, d] = [+m[1]!, +m[2]!, +m[3]!];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function validateField(field: PersonField, raw: string, todayIso: string = new Date().toISOString().slice(0, 10)): FieldResult {
  const meta: { label: string; kind: string; max?: number; options?: readonly (readonly [string, string])[]; required?: boolean } = FIELD_META[field];
  const v = (raw ?? "").trim();

  if (field === "name") {
    if (!v) return { ok: false, error: "Informe o nome." };
    if (v.length > 120) return { ok: false, error: "Nome muito longo." };
    return { ok: true, text: v, value: v };
  }
  if (meta.kind === "select") {
    if (!v) return meta.required ? { ok: false, error: "Escolha uma opção." } : { ok: true, text: "", value: null };
    if (!meta.options?.some((o) => o[0] === v)) return { ok: false, error: "Opção inválida." };
    return { ok: true, text: v, value: field === "isLeader" ? v === "true" : v };
  }
  if (!v) return { ok: true, text: "", value: null };

  switch (meta.kind) {
    case "date":
      if (!realDate(v)) return { ok: false, error: "Data inválida." };
      if (field === "birthDate" && v > todayIso) return { ok: false, error: "A data de nascimento não pode ser futura." };
      return { ok: true, text: v, value: v };
    case "email":
      if (v.length > (meta.max ?? 160) || !EMAIL.test(v)) return { ok: false, error: "E-mail inválido." };
      return { ok: true, text: v, value: v };
    case "tel":
      if (v.length > (meta.max ?? 30) || !/^[\d\s()+.-]+$/.test(v) || onlyDigits(v).length < 8) return { ok: false, error: "Telefone inválido." };
      return { ok: true, text: v, value: v };
    case "cpf": {
      if (!isValidCpf(v)) return { ok: false, error: "CPF inválido." };
      const d = onlyDigits(v);
      return { ok: true, text: d, value: d };
    }
    default: {
      if (v.length > (meta.max ?? 120)) return { ok: false, error: "Texto muito longo." };
      const t = field === "postalCode" ? formatCep(v) : field === "state" && v.length === 2 ? v.toUpperCase() : v;
      return { ok: true, text: t, value: t };
    }
  }
}

// Saída da igreja: data real e motivo da lista.
export function validateExit(date: string, reason: string): { ok: true } | { ok: false; error: string } {
  if (!realDate((date ?? "").trim())) return { ok: false, error: "Informe a data da saída." };
  if (!FIELD_META.exitReason.options.some((o) => o[0] === reason)) return { ok: false, error: "Escolha o motivo." };
  return { ok: true };
}
