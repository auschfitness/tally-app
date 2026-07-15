"use client";

// Aba Conta (Client — Server Action). Seu nome (profiles.full_name) + idioma/fuso
// (blob). Tema fica no Topbar (ThemeToggle), não aqui. Cargo é só leitura.
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, TIMEZONES } from "../domain";
import { updateAccountAction } from "../actions";
import type { AccountConfig } from "../types";
import { type ActionResult } from "@/lib/errors";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function AccountPanel({ userName, account, isOwner }: { userName: string; account: AccountConfig; isOwner: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateAccountAction, INITIAL);
  const saved = useRef(false);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      saved.current = true;
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="panel">
      <div className={styles.setrow}>
        <div className={styles.lbl}>Seu nome</div>
        <div className={styles.ctrl}><input name="fullName" defaultValue={userName} placeholder="Como você aparece na equipe" /></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>Idioma<small>Tradução completa da interface em breve</small></div>
        <div className={styles.ctrl}>
          <select name="language" defaultValue={account.language}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>Fuso horário</div>
        <div className={styles.ctrl}>
          <select name="timezone" defaultValue={account.timezone}>
            {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>Tema</div>
        <div className={styles.ctrl}><span className="muted">Ajuste o tema (claro/escuro) pelo botão no topo da tela.</span></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>Cargo</div>
        <div className={styles.ctrl}><span className="chip leader">{isOwner ? "Dono da conta" : "Membro da equipe"}</span></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl} />
        <div className={styles.ctrl}>
          {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
          <div><button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button></div>
        </div>
      </div>
    </form>
  );
}
