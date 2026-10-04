"use client";

import { useState } from "react";
import s from "./login.module.css";

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className={s.pw}>
      <input {...props} type={show ? "text" : "password"} />
      <button
        type="button"
        className={s.eye}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setShow((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
