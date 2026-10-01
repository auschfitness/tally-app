"use client";

// Editor de sermão como CANVAS (Client): título H1, três pílulas (status, data, série),
// passagem + ideia central sem rótulo, corpo aberto (content.notes) e seções opcionais no
// fluxo. Barra: Passagens (painel) e "···" (arquivar/excluir). Autosave discreto (debounce
// 900ms) via Server Action, preservando o shape do `content` (nunca null), os sub-campos
// extras do blob e os campos que saíram da tela (subtítulo, campus, visibilidade, culto).
import { DateField } from "@/components/shared/DateField";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSermonAction, saveSermonAction, syncSermonScripturesAction } from "../actions";
import { CHOOSABLE_STATUSES, OPTIONAL_SECTIONS, SECTIONS, STATUS_COLOR, STATUS_LBL, appendBlock, longDate, type SectionKey } from "../domain";
import type { Sermon, SermonContent } from "../types";
import type { Series } from "../types";
import { parseRefs, refKey, type ScriptureRef } from "@/lib/bible/parse";
import { PassagesPanel } from "./PassagesPanel";
import { Popover } from "./Popover";
import styles from "../study.module.css";

interface SectionValues {
  outline: string;
  notes: string;
  illustrations: string;
  application: string;
  prayer_response: string;
}

// Referências do sermão: a passagem principal e o texto das seções (reconhecimento sempre
// ligado). Portado de refsForCurrent().
function refsFor(mainPassage: string, v: SectionValues): ScriptureRef[] {
  return parseRefs(mainPassage + "\n" + [v.outline, v.notes, v.illustrations, v.application, v.prayer_response].join("\n"));
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
  activeCampus,
  embedded = false,
  incoming = null,
  onSaved,
  onDeleted,
  onIncomingDone,
}: {
  sermon: Sermon | null;
  series: Series[];
  activeCampus: string;
  embedded?: boolean; // dentro da tela de leitura: não troca a URL nem volta à biblioteca
  incoming?: { block: string; section: SectionKey; seq: number } | null;
  // Recebe o sermão como está sendo gravado, para quem reabre o editor não partir do
  // retrato velho do servidor (a aba Sermão da leitura).
  onSaved?: (s: Sermon) => void;
  onDeleted?: (id: string) => void; // sermão foi para a Lixeira (embutido: quem hospeda volta à escolha)
  onIncomingDone?: (seq: number) => void; // bloco de `incoming` já entrou no texto
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
  const [hasId, setHasId] = useState(!!sermon?.id);
  const [passagesOpen, setPassagesOpen] = useState(false);

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
    const snapshot = (id: string): Sermon => ({
      ...m,
      id,
      description: sermon?.description ?? "",
      series_id: m.series_id || null,
      service_id: m.service_id || null,
      content,
      updated_at: new Date().toISOString(),
    });
    if (idRef.current) onSaved?.(snapshot(idRef.current));
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
      onSaved?.(snapshot(res.data.id));
      if (!idRef.current) {
        idRef.current = res.data.id;
        setHasId(true);
        initialContent.current = content;
        // Adota a URL do sermão salvo sem remontar o editor (shallow).
        if (!embedded) window.history.replaceState(null, "", `/study/sermon/${res.data.id}`);
      }
      // Sincroniza as passagens do sermão (upsert/remoção), com o id já garantido.
      void syncSermonScripturesAction(idRef.current, refsFor(m.main_passage, v));
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
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void doSave();
    }, 900);
  }

  // Save pendente grava na hora em vez de perder os últimos 900ms: ao desmontar (troca
  // de sermão, fechar a aba, navegar no app) e ao sair do documento (recarregar, fechar
  // o navegador), que não desmonta nada; aí o navegador também pede confirmação enquanto
  // a gravação não volta. doSave só lê refs; setState depois de desmontado é ignorado.
  useEffect(() => {
    function flush(): void {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      void doSave();
    }
    function onLeave(e: BeforeUnloadEvent): void {
      if (!timerRef.current && !savingRef.current) return;
      flush();
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    timerRef.current = null;
    if (dirtyRef.current && meta.title.trim()) await doSave();
    router.push("/study");
  }

  // Vai para a lixeira (30 dias para restaurar), então não pede confirmação.
  async function moveToTrash() {
    const id = idRef.current;
    if (!id) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const res = await deleteSermonAction(id);
    if (!res.success) {
      setStatus(res.message || "Não consegui excluir o sermão.");
      return;
    }
    if (embedded) {
      onDeleted?.(id);
      router.refresh();
    } else router.push("/study");
  }

  const archived = meta.status === "archived";
  const shownStatus = meta.status === "preparing" ? "draft" : meta.status;

  // Anexa um bloco (de uma lente do estudo) ao fim da SEÇÃO escolhida do canvas. Se a
  // seção era opcional e estava oculta, passa a aparecer (agora tem conteúdo).
  function addBlockToSection(block: string, section: SectionKey) {
    setValues((prev) => ({ ...prev, [section]: appendBlock(prev[section], block) }));
    if (section !== "notes") setPresent((prev) => new Set(prev).add(section));
    scheduleSave();
  }

  // Blocos vindos de fora (leitura, spec 07) ou do painel Passagens: cada um entra uma vez.
  // O aviso "Adicionado em … · Desfazer" guarda a seção como estava, para desfazer sem perguntar.
  const lastSeq = useRef(0);
  const [added, setAdded] = useState<{ section: SectionKey; prev: string; had: boolean } | null>(null);
  function addWithUndo(block: string, section: SectionKey): void {
    setAdded({ section, prev: values[section] ?? "", had: present.has(section) });
    addBlockToSection(block, section);
  }
  useEffect(() => {
    if (!incoming || incoming.seq === lastSeq.current) return;
    lastSeq.current = incoming.seq;
    addWithUndo(incoming.block, incoming.section);
    onIncomingDone?.(incoming.seq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(null), 6000);
    return () => window.clearTimeout(t);
  }, [added]);
  function undoAdded(): void {
    if (!added) return;
    const { section, prev, had } = added;
    setValues((v) => ({ ...v, [section]: prev }));
    if (!had && section !== "notes") setPresent((p) => { const n = new Set(p); n.delete(section); return n; });
    scheduleSave();
    setAdded(null);
  }

  const addable = OPTIONAL_SECTIONS.filter((s) => !present.has(s.key));
  const detected = refsFor(meta.main_passage, values);
  const mainRef = parseRefs(meta.main_passage)[0] ?? null;
  const seriesTitle = series.find((x) => x.id === meta.series_id)?.title || "";

  return (
    <div>
      <div className={styles.bar}>
        {embedded ? null : <button className="link" onClick={backToLibrary}>‹ Sermões</button>}
        <span className={styles.status}>{status}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.secondary} aria-expanded={passagesOpen} aria-controls="passages-panel" onClick={() => setPassagesOpen((o) => !o)}>
          Passagens <span className={styles.cnt}>{detected.length}</span>
        </button>
        <Popover trigger="···" triggerClass={styles.edIcon} label="Mais opções" align="right">
          {(close) => (
            <>
              <button type="button" role="menuitem" className={styles.mi} onClick={() => { close(); setField("status", archived ? "draft" : "archived"); }}>
                {archived ? "Desarquivar" : "Arquivar"}
              </button>
              <hr className={styles.miSep} />
              <button type="button" role="menuitem" className={`${styles.mi} ${styles.miDanger}`} data-testid="sermon-trash" disabled={!hasId} onClick={() => { close(); void moveToTrash(); }}>
                Excluir sermão
              </button>
              <p className={styles.miNote}>Vai para a Lixeira por 30 dias</p>
            </>
          )}
        </Popover>
      </div>

      <main className={styles.canvas}>
        <input className={styles.title} value={meta.title} placeholder="Sem título" autoFocus={!sermon} onChange={(e) => setField("title", e.target.value)} />
        <div className={styles.pills}>
          <Popover
            label="Status"
            triggerClass={styles.pill}
            trigger={<><i className={styles.dot} style={{ background: STATUS_COLOR[shownStatus] }} />{STATUS_LBL[shownStatus]}</>}
          >
            {(close) => CHOOSABLE_STATUSES.map((k) => (
              <button key={k} type="button" role="menuitemradio" aria-checked={shownStatus === k} className={styles.mi} onClick={() => { close(); setField("status", k); }}>
                <i className={styles.dot} style={{ background: STATUS_COLOR[k] }} />
                <span>{STATUS_LBL[k]}</span>
                <span className={styles.miCk} aria-hidden>✓</span>
              </button>
            ))}
          </Popover>
          <Popover
            label="Data"
            haspopup="dialog"
            triggerClass={`${styles.pill}${meta.sermon_date ? "" : " " + styles.pillMuted}`}
            trigger={meta.sermon_date ? longDate(meta.sermon_date) || meta.sermon_date : "Marcar data"}
          >
            {(close) => (
              <div className={styles.popDate}>
                <DateField aria-label="Data" value={meta.sermon_date} onChange={(iso) => setField("sermon_date", iso)} />
                {meta.sermon_date ? (
                  <button type="button" className={`${styles.mi} ${styles.miMuted}`} onClick={() => { close(); setField("sermon_date", ""); }}>Tirar data</button>
                ) : null}
              </div>
            )}
          </Popover>
          <Popover
            label="Série"
            triggerClass={`${styles.pill}${meta.series_id ? "" : " " + styles.pillMuted}`}
            trigger={meta.series_id ? `Série: ${seriesTitle || "(sem título)"}` : "Sem série"}
          >
            {(close) => (
              <div className={styles.popList}>
                <button type="button" role="menuitemradio" aria-checked={!meta.series_id} className={styles.mi} onClick={() => { close(); setField("series_id", ""); }}>
                  <span>Sem série</span><span className={styles.miCk} aria-hidden>✓</span>
                </button>
                {series.map((se) => (
                  <button key={se.id} type="button" role="menuitemradio" aria-checked={meta.series_id === se.id} className={styles.mi} onClick={() => { close(); setField("series_id", se.id); }}>
                    <span>{se.title || "(sem título)"}</span><span className={styles.miCk} aria-hidden>✓</span>
                  </button>
                ))}
              </div>
            )}
          </Popover>
        </div>
        <input className={styles.passageInput} aria-label="Passagem principal" value={meta.main_passage} placeholder="Passagem principal, ex.: João 3:16" onChange={(e) => setField("main_passage", e.target.value)} />
        <input className={styles.ideaInput} aria-label="Ideia central" value={meta.big_idea} placeholder="Ideia central, a mensagem em uma frase" onChange={(e) => setField("big_idea", e.target.value)} />

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

      <PassagesPanel open={passagesOpen} refs={detected} mainKey={mainRef ? refKey(mainRef) : null} onClose={() => setPassagesOpen(false)} onAdd={addWithUndo} />

      {added ? (
        <div className={styles.addedToast} role="status">
          Adicionado em {SECTIONS.find((x) => x.key === added.section)?.label ?? "sermão"}
          <button type="button" onClick={undoAdded}>Desfazer</button>
        </div>
      ) : null}
    </div>
  );
}
