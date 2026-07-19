"use client";

// Controle de visibilidade do espaço (Client), só para quem administra a igreja
// (org.manage). Escolhe entre "Só liderança" (padrão) e "Todos os membros"; salva na hora
// via Server Action. Deixa explícito que espaços existentes nascem fechados.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { setSpaceVisibility } from "../actions";
import type { SpaceVisibility as Visibility } from "../types";

export function SpaceVisibility({
  spaceId,
  visibility,
}: {
  spaceId: string;
  visibility: Visibility;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Visibility>(visibility);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(next: Visibility) {
    const prev = value;
    setValue(next);
    setSaving(true);
    setErr(null);
    const res = await setSpaceVisibility(spaceId, next);
    setSaving(false);
    if (res.success) {
      router.refresh();
    } else {
      setValue(prev); // desfaz na falha
      setErr(res.message);
    }
  }

  return (
    <div className="field" style={{ minWidth: 0 }}>
      <label style={{ fontSize: 12 }}>Quem vê este espaço</label>
      <Select
        compact
        value={value}
        disabled={saving}
        onChange={(e) => onChange(e.target.value as Visibility)}
      >
        <option value="leaders">Só liderança</option>
        <option value="members">Todos os membros</option>
      </Select>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 4, maxWidth: 220 }}>
        Espaços nascem fechados (só liderança). Abra para todos quando quiser.
      </div>
      {err ? <div className="gerr">{err}</div> : null}
    </div>
  );
}
