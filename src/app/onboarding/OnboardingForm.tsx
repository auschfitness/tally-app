"use client";

import { Select } from "@/components/shared/Select";
import { useActionState, useState } from "react";
import { createOrgAction, type OnboardingState } from "./actions";

const INITIAL: OnboardingState = { error: null };

// País escolhido no cadastro dita os dados jurídicos (BR → CNPJ/Pix; US → EIN/501c3)
// e sugere a moeda. A moeda segue editável.
const CURRENCY_BY_COUNTRY: Record<string, string> = { BR: "BRL", US: "USD" };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrgAction, INITIAL);
  const [country, setCountry] = useState("BR");
  const [currency, setCurrency] = useState("BRL");

  function pickCountry(next: string) {
    setCountry(next);
    setCurrency(CURRENCY_BY_COUNTRY[next] ?? "BRL"); // sugestão; segue editável abaixo
  }

  return (
    <form action={formAction}>
      <div className="gtitle">Sua igreja</div>
      <div className="gsub">Vamos criar a sua igreja no Tally.</div>

      <div className="gfield">
        <input name="name" placeholder="Nome da igreja" required />
      </div>
      <div className="gfield">
        <Select name="country" value={country} onChange={(e) => pickCountry(e.target.value)}>
          <option value="BR">Brasil</option>
          <option value="US">Estados Unidos</option>
        </Select>
      </div>
      <div className="gfield">
        <Select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="BRL">Real (BRL)</option>
          <option value="USD">Dólar (USD)</option>
        </Select>
      </div>

      <div className="gerr">{state.error ?? ""}</div>

      <button className="gbtn" type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar igreja"}
      </button>
    </form>
  );
}
