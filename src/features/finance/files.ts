// Comprovantes (spec 12, fase C). Um arquivo pode estar ligado à conta, ao lançamento ou aos
// dois (a conta paga leva o anexo para o lançamento, m65). Regras puras aqui; testes em files.test.ts.

export interface FinanceFile {
  id: string;
  billId: string | null;
  entryId: string | null;
  name: string;
  mime: string;
  url: string; // URL assinada, vale 1 h
}

export type FileTarget = { billId: string } | { entryId: string };

export const FILES_BUCKET = "finance-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_ITEM = 5;
export const FILE_ACCEPT = "image/*,application/pdf";

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/webp": "webp",
};

export function fileExt(mime: string): string | null {
  return EXT[mime] ?? null;
}

export function fileProblem(mime: string, size: number): string | null {
  if (!fileExt(mime)) return "Use PDF, JPG, PNG, HEIC ou WEBP.";
  if (size <= 0) return "Arquivo vazio.";
  if (size > MAX_FILE_BYTES) return "Arquivo maior que 10 MB.";
  return null;
}

// Linha digitável de boleto colada nas observações: 47 dígitos (bancário) ou 48 (convênio:
// luz, água). Aceita pontos, espaços e traços no meio. Sem OCR: só o que a pessoa colou.
export function boletoCode(notes: string): string | null {
  for (const chunk of notes.match(/[\d][\d.\s-]{40,70}[\d]/g) ?? []) {
    const digits = chunk.replace(/\D/g, "");
    if (digits.length === 47 || digits.length === 48) return digits;
  }
  return null;
}
