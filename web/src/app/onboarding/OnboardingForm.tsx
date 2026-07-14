"use client";

import { useActionState } from "react";
import { createOrgAction, type OnboardingState } from "./actions";

const INITIAL: OnboardingState = { error: null };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrgAction, INITIAL);

  return (
    <form action={formAction}>
      <div className="gtitle">Sua igreja</div>
      <div className="gsub">Vamos criar a sua igreja no Tally.</div>

      <div className="gfield">
        <input name="name" placeholder="Nome da igreja" required />
      </div>
      <div className="gfield">
        <input name="campus" placeholder="Primeiro campus (ex.: Sede)" />
      </div>
      <div className="gfield">
        <select name="currency" defaultValue="BRL">
          <option value="BRL">Real (BRL)</option>
          <option value="USD">Dólar (USD)</option>
        </select>
      </div>

      <div className="gerr">{state.error ?? ""}</div>

      <button className="gbtn" type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar igreja"}
      </button>
    </form>
  );
}
