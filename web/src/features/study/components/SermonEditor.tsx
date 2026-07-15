"use client";

// Editor de sermão como CANVAS (Client): título H1, passagem + ideia central como
// subcabeçalho, corpo aberto (content.notes) e seções opcionais no fluxo. Metadados
// num drawer de Propriedades. Autosave discreto (debounce 900ms) via Server Action,
// preservando o shape do `content` (nunca null) e os sub-campos extras do blob.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSermonAction } from "../actions";
import { OPTIONAL_SECTIONS, SECTIONS, STATUS_LBL, VIS_LBL } from "../domain";
import type { Sermon, SermonContent } from "../types";
import type { Series } from "../types";
import styles from "../study.module.css";

type SectionKey = (typeof SECTIONS)[number]["key"];
interface SectionValues {
  outline: string;
  notes: string;
  illustrations: string;
  application: string;
  prayer_response: string;
}

interface ServiceOpt {
  id: string;
  name: string;
}

function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [value]);
  return <textarea ref={ref} className={className} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function SermonEditor({
  sermon,
  series,
  services,
  campuses,
  activeCampus,
}: {
  sermon: Sermon | null;
  series: Series[];
  services: ServiceOpt[];
  campuses: string[];
  activeCampus: string;
}) {
  const router = useRouter();
  const initialContent = useRef<SermonContent>(sermon?.content ?? {});

  const idRef = useRef<string | null>(sermon?.id ?? null);

  const [meta, setMeta] = useState({
    title: sermon?.title ?? "",
    subtitle: sermon?.subtitle ?? "",
    main_passage: sermon?.main_passage ?? "",
    big_idea: sermon?.big_idea ?? "",
    status: sermon?.status ?? "draft",
    visibility: sermon?.visibility ?? "church",
    campus: sermon?.campus || activeCampus,
    sermon_date: sermon?.sermon_date ?? "",
    series_id: sermon?.series_id ?? "",
    service_id: sermon?.service_id ?? "",
  });

  const c = sermon?.content ?? {};
  const [values, setValues] = useState<SectionValues>({
    outline: String(c.outline ?? ""),
    notes: String(c.notes ?? ""),
    illustrations: String(c.illustrations ?? ""),
    application: String(c.application ?? ""),
    prayer_response: String(c.prayer_response ?? ""),
  });
  const [present, setPresent] = useState<Set<string>>(
    () => new Set(OPTIONAL_SECTIONS.filter((s) => String(c[s.key] ?? "").trim()).map((s) => s.key)),
  );

  const [status, setStatus] = useState(sermon ? "Salvo" : "Novo sermão");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const savingRef = useRef(false);
  const rerunRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Snapshot atual (via ref) para o save assíncrono sempre ver o estado mais novo.
  const snapRef = useRef({ meta, values });
  snapRef.current = { meta, values };

  async function doSave() {
    if (savingRef.current) {
      rerunRef.current = true;
      return;
    }
    const { meta: m, values: v } = snapRef.current;
    if (!m.title.trim()) {
      setStatus("Dê um título para salvar");
      return;
    }
    const content: SermonContent = {
      ...initialContent.current,
      outline: v.outline,
      notes: v.notes,
      illustrations: v.illustrations,
      application: v.application,
      prayer_response: v.prayer_response,
    };
    savingRef.current = true;
    setStatus("Salvando…");
    const res = await saveSermonAction({
      id: idRef.current,
      title: m.title,
      subtitle: m.subtitle,
      main_passage: m.main_passage,
      big_idea: m.big_idea,
      status: m.status,
      visibility: m.visibility,
      campus: m.campus,
      sermon_date: m.sermon_date,
      series_id: m.series_id || null,
      service_id: m.service_id || null,
      content,
    });
    savingRef.current = false;
    if (res.success) {
      setStatus("Salvo");
      if (!idRef.current) {
        idRef.current = res.data.id;
        initialContent.current = content;
        // Adota a URL do sermão salvo sem remontar o editor (shallow).
        window.history.replaceState(null, "", `/study/sermon/${res.data.id}`);
      }
    } else {
      setStatus(res.message || "Não foi possível salvar");
    }
    if (rerunRef.current) {
      rerunRef.current = false;
      void doSave();
    }
  }

  function scheduleSave() {
    dirtyRef.current = true;
    setStatus("Editando…");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void doSave(), 900);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function setField<K extends keyof typeof meta>(k: K, val: (typeof meta)[K]) {
    setMeta((prev) => ({ ...prev, [k]: val }));
    scheduleSave();
  }
  function setSection(k: SectionKey, val: string) {
    setValues((prev) => ({ ...prev, [k]: val }));
    scheduleSave();
  }
  function addSection(k: string) {
    setPresent((prev) => new Set(prev).add(k));
  }
  function removeSection(k: SectionKey) {
    if (values[k].trim() && !window.confirm("Remover esta seção e o conteúdo dela?")) return;
    setValues((prev) => ({ ...prev, [k]: "" }));
    setPresent((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    scheduleSave();
  }

  async function backToLibrary() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dirtyRef.current && meta.title.trim()) await doSave();
    router.push("/study");
  }

  const addable = OPTIONAL_SECTIONS.filter((s) => !present.has(s.key));

  return (
    <div>
      <div className={styles.bar}>
        <button className="link" onClick={backToLibrary}>← Biblioteca</button>
        <span className={styles.status}>{status}</span>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={() => setDrawerOpen(true)}>Propriedades</button>
      </div>

      <main className={styles.canvas}>
        <input className={styles.title} value={meta.title} placeholder="Sem título" autoFocus={!sermon} onChange={(e) => setField("title", e.target.value)} />
        <div className={styles.subhead}>
          <input className={styles.metaInput} value={meta.main_passage} placeholder="Passagem principal — ex.: João 10:1-18" onChange={(e) => setField("main_passage", e.target.value)} />
          <input className={styles.metaInput} value={meta.big_idea} placeholder="Ideia central — a mensagem em uma frase" onChange={(e) => setField("big_idea", e.target.value)} />
        </div>

        <AutoTextarea className={styles.doc} value={values.notes} placeholder="Comece a escrever…" onChange={(v) => setSection("notes", v)} />

        <div>
          {OPTIONAL_SECTIONS.filter((s) => present.has(s.key)).map((sec) => (
            <section className={styles.block} key={sec.key}>
              <div className={styles.sech}>
                <span className={styles.seclabel}>{sec.label}</span>
                <button className="link" onClick={() => removeSection(sec.key)}>remover</button>
              </div>
              <AutoTextarea className={styles.doc} value={values[sec.key]} placeholder={sec.ph} onChange={(v) => setSection(sec.key, v)} />
            </section>
          ))}
        </div>

        {addable.length ? (
          <div className={styles.addsec}>
            {addable.map((sec) => (
              <button key={sec.key} className={styles.addbtn} onClick={() => addSection(sec.key)}>+ {sec.label}</button>
            ))}
          </div>
        ) : null}
      </main>

      {drawerOpen ? (
        <>
          <div className={styles.drawerOv} onClick={() => setDrawerOpen(false)} />
          <aside className={styles.drawer}>
            <div className="ph"><h3>Propriedades</h3><button className="link" style={{ marginLeft: "auto" }} onClick={() => setDrawerOpen(false)}>Fechar</button></div>
            <div className="field"><label>Subtítulo</label><input value={meta.subtitle} placeholder="Opcional" onChange={(e) => setField("subtitle", e.target.value)} /></div>
            <div className="mrow">
              <div className="field"><label>Status</label>
                <select value={meta.status} onChange={(e) => setField("status", e.target.value as typeof meta.status)}>
                  {Object.entries(STATUS_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Quem vê</label>
                <select value={meta.visibility} onChange={(e) => setField("visibility", e.target.value as typeof meta.visibility)}>
                  {Object.entries(VIS_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="mrow">
              <div className="field"><label>Campus</label>
                <select value={meta.campus} onChange={(e) => setField("campus", e.target.value)}>
                  {campuses.map((cp) => <option key={cp} value={cp}>{cp}</option>)}
                </select>
              </div>
              <div className="field"><label>Data</label><input type="date" value={meta.sermon_date} onChange={(e) => setField("sermon_date", e.target.value)} /></div>
            </div>
            <div className="field"><label>Série</label>
              <select value={meta.series_id} onChange={(e) => setField("series_id", e.target.value)}>
                <option value="">Sem série</option>
                {series.map((se) => <option key={se.id} value={se.id}>{se.title || "(sem título)"}</option>)}
              </select>
            </div>
            <div className="field"><label>Culto (pregado em)</label>
              <select value={meta.service_id} onChange={(e) => setField("service_id", e.target.value)}>
                <option value="">Nenhum</option>
                {services.map((sv) => <option key={sv.id} value={sv.id}>{sv.name || "(sem nome)"}</option>)}
              </select>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
