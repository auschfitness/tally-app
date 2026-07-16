"use client";

// Seletor de idioma (Client). Persiste na hora: ao trocar, grava em profiles.locale
// via setLocaleAction e recarrega (o idioma é do usuário e afeta toda a UI). Usa o
// <Select> padronizado. Ver docs/handoffs/ui-fixes-i18n.md.
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";

export function LocaleSelect({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label="Idioma"
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        });
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </Select>
  );
}
