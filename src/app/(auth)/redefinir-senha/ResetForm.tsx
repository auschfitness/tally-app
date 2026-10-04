"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PasswordInput } from "../login/PasswordInput";
import { updatePasswordAction, type ResetState } from "./actions";
import s from "../login/login.module.css";

const INITIAL: ResetState = { error: null };

export function ResetForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, INITIAL);
  return (
    <form action={formAction} className={s.form}>
      <h1 className={s.title}>Nova senha</h1>
      <p className={s.sub}>Escolha uma senha com pelo menos 6 caracteres.</p>
      <label className={s.field}>
        Nova senha
        <PasswordInput name="password" placeholder="Nova senha" autoComplete="new-password" minLength={6} required />
      </label>
      <label className={s.field}>
        Confirmar senha
        <PasswordInput name="confirm" placeholder="Confirmar senha" autoComplete="new-password" minLength={6} required />
      </label>
      <div className={s.err} role="alert" data-on={!!state.error}>{state.error ?? ""}</div>
      {state.expired && <Link href="/esqueci-senha">Pedir novo link</Link>}
      <button className={s.btn} type="submit" disabled={pending}>
        {pending ? "Aguarde..." : "Salvar senha"}
      </button>
    </form>
  );
}
