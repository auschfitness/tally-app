"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction, type ForgotState } from "./actions";
import s from "../login/login.module.css";

const INITIAL: ForgotState = { message: null };

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestResetAction, INITIAL);
  return (
    <form action={formAction} className={s.form}>
      <h1 className={s.title}>Redefinir senha</h1>
      <p className={s.sub}>Enviaremos um link para o seu e-mail.</p>
      <label className={s.field}>
        E-mail
        <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
      </label>
      <div className={s.ok} role="status">{state.message ?? ""}</div>
      <button className={s.btn} type="submit" disabled={pending}>
        {pending ? "Aguarde..." : "Enviar link"}
      </button>
      <p className={s.switch}>
        <Link href="/login">Voltar para entrar</Link>
      </p>
    </form>
  );
}
