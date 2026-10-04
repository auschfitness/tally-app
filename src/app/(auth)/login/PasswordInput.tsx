"use client";

import { UiIcon } from "@/components/shared/UiIcon";
import { Eye, EyeOff } from "lucide-react";
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
        <UiIcon icon={show ? EyeOff : Eye} />
      </button>
    </div>
  );
}
