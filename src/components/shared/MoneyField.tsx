"use client";

// <MoneyField> — campo de dinheiro com máscara pela moeda da organização
// (organizations.currency). Enquanto digita, mantém o texto do usuário; ao sair do
// campo, formata para o padrão da moeda (BRL "R$ 1.234,56" / USD "$1,234.56"). O
// valor numérico (ex.: "1234.56") trafega por um <input hidden name> para a Server
// Action. Interpretação em `parseMoneyInput`: dígitos puros = centavos; com separador
// = decimal (respeita digitação manual). Roadmap #4.
import { useState } from "react";
import { money, parseMoneyInput } from "@/lib/utils/money";

export interface MoneyFieldProps {
  name: string;
  currency: string;
  defaultValue?: number;
  id?: string;
  autoFocus?: boolean;
}

export function MoneyField({ name, currency, defaultValue, id, autoFocus }: MoneyFieldProps) {
  const [text, setText] = useState(defaultValue && defaultValue > 0 ? money(defaultValue, currency) : "");
  const amount = parseMoneyInput(text, currency);
  const hidden = amount != null && amount > 0 ? String(amount) : "";
  const placeholder = currency === "USD" ? "$0.00" : "R$ 0,00";

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const a = parseMoneyInput(text, currency);
          setText(a != null && a > 0 ? money(a, currency) : "");
        }}
      />
      <input type="hidden" name={name} value={hidden} />
    </>
  );
}
