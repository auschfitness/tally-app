// Bancos com logo (spec 11). Logos oficiais vindas do pacote logos-bancos-br 0.8.0 (MIT;
// cada arquivo foi baixado pelo pacote da fonte oficial do banco no diretório do Open
// Finance), copiadas para public/banks/<COMPE>.png. São marcas dos bancos, usadas só para
// identificar a conta. Ordem = mais comuns em igrejas primeiro.
export interface Bank {
  code: string; // COMPE
  name: string;
}

export const BANKS: Bank[] = [
  { code: "001", name: "Banco do Brasil" },
  { code: "104", name: "Caixa" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú" },
  { code: "033", name: "Santander" },
  { code: "260", name: "Nubank" },
  { code: "077", name: "Inter" },
  { code: "748", name: "Sicredi" },
  { code: "756", name: "Sicoob" },
  { code: "336", name: "C6 Bank" },
  { code: "380", name: "PicPay" },
  { code: "323", name: "Mercado Pago" },
  { code: "290", name: "PagBank" },
  { code: "208", name: "BTG Pactual" },
  { code: "403", name: "Cora" },
  { code: "197", name: "Stone" },
  { code: "041", name: "Banrisul" },
  { code: "070", name: "BRB" },
  { code: "422", name: "Safra" },
  { code: "655", name: "BV" },
  { code: "085", name: "Ailos" },
  { code: "136", name: "Unicred" },
];

// Valores especiais de bank_code que não são banco.
export const CASH_CODE = "caixa";
export const OTHER_BANK_CODE = "outro";

export function bankByCode(code: string | null): Bank | undefined {
  return code ? BANKS.find((b) => b.code === code) : undefined;
}

export function bankLogo(code: string | null): string | null {
  return bankByCode(code) ? `/banks/${code}.png` : null;
}
