"use client";

// Controles do workspace da série (Client — Server Actions): editar a série e
// adicionar um sermão a ela. Remover um sermão é um form simples (server action).
import { Select } from "@/components/shared/Select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSermonSeriesAction } from "../actions";
import { SeriesModal } from "./SeriesModal";
import type { Series } from "../types";
import styles from "../study.module.css";

export function EditSeriesButton({ series }: { series: Series }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost" onClick={() => setOpen(true)}>Editar série</button>
      {open ? <SeriesModal series={series} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function AddSermonToSeries({ seriesId, options }: { seriesId: string; options: { id: string; title: string }[] }) {
  const router = useRouter();
  if (options.length === 0) {
    return <div className={`muted ${styles.serAdd}`}>Todos os sermões já estão nesta série.</div>;
  }
  return (
    <form className={`mrow ${styles.serAdd}`} action={setSermonSeriesAction} onSubmit={() => setTimeout(() => router.refresh(), 400)}>
      <input type="hidden" name="seriesId" value={seriesId} />
      <input type="hidden" name="backTo" value={`/study/series/${seriesId}`} />
      <div className="field">
        <label>Adicionar sermão à série</label>
        <Select name="sermonId" defaultValue={options[0]?.id ?? ""}>
          {options.map((s) => <option key={s.id} value={s.id}>{s.title || "(sem título)"}</option>)}
        </Select>
      </div>
      <div className={`field ${styles.serAddBtn}`}>
        <button className="btn ghost" type="submit">Adicionar</button>
      </div>
    </form>
  );
}
