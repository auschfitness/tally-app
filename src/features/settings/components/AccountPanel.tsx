"use client";

// Aba Conta (Client — Server Action). Seu nome (profiles.full_name) + fuso (blob).
// Idioma = profiles.locale via <LocaleSelect> (persiste na hora, separado do form).
// Tema fica no Topbar (ThemeToggle). Cargo é só leitura. Strings do dicionário i18n.
import { Select } from "@/components/shared/Select";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONES } from "../domain";
import { updateAccountAction } from "../actions";
import type { AccountConfig } from "../types";
import { type ActionResult } from "@/lib/errors";
import { LocaleSelect } from "@/lib/i18n/LocaleSelect";
import type { Dictionary, Locale } from "@/lib/i18n";
import styles from "../settings.module.css";

const INITIAL: ActionResult = { success: true, data: undefined };

export function AccountPanel({
  userName,
  account,
  locale,
  isOwner,
  dict,
}: {
  userName: string;
  account: AccountConfig;
  locale: Locale;
  isOwner: boolean;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateAccountAction, INITIAL);
  const t = dict.settings;

  useEffect(() => {
    if (state.success && state !== INITIAL) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="panel">
      <div className={styles.setrow}>
        <div className={styles.lbl}>{t.yourName}</div>
        <div className={styles.ctrl}><input name="fullName" defaultValue={userName} placeholder={t.yourNamePlaceholder} /></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>{t.language}<small>{t.languageHint}</small></div>
        <div className={styles.ctrl}><LocaleSelect current={locale} /></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>{t.timezone}</div>
        <div className={styles.ctrl}>
          <Select name="timezone" defaultValue={account.timezone}>
            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </Select>
        </div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>{t.theme}</div>
        <div className={styles.ctrl}><span className="muted">{t.themeHint}</span></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl}>{t.role}</div>
        <div className={styles.ctrl}><span className="chip leader">{isOwner ? t.roleOwner : t.roleMember}</span></div>
      </div>
      <div className={styles.setrow}>
        <div className={styles.lbl} />
        <div className={styles.ctrl}>
          {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
          <div><button className="btn" type="submit" disabled={pending}>{pending ? t.saving : t.save}</button></div>
        </div>
      </div>
    </form>
  );
}
