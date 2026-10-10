"use client";

// Ficha da pessoa (spec 13): cabeçalho com foto e nome, e seções (Contato, Dados pessoais,
// Documentos, Endereço, Família, Vida na igreja, Dízimos). Cada campo é editado no lugar; uma
// seção some se estiver vazia e a pessoa não puder editar. A tela guarda o estado; aqui só se
// desenha e se grava (Server Actions).
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { DateField } from "@/components/shared/DateField";
import { Select } from "@/components/shared/Select";
import { createClient } from "@/lib/supabase/client";
import { brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { Popover } from "@/features/study/components/Popover";
import studyStyles from "@/features/study/study.module.css";
import {
  attachPhotoAction,
  preparePhotoAction,
  registerExitAction,
  setArchivedAction,
  updatePersonFieldAction,
  shareFamilyAddressAction,
} from "../actions";
import {
  EXIT_OPTIONS,
  FIELD_META,
  OFFICE_SUGGESTIONS,
  PHOTO_BUCKET,
  ageLabel,
  formatCpf,
  formatPhone,
  initialsOf,
  optionLabel,
  relLabel,
  statusValue,
  whatsappLink,
  type PersonField,
  type Relationship,
} from "../domain";
import type { Family, PersonDetail, PersonListItem } from "../types";
import { Field } from "./Field";
import { FamilySection } from "./FamilySection";
import styles from "../people.module.css";

const SAVED_MS = 1500;

// Como cada campo aparece quando não está sendo editado.
function show(field: PersonField, value: string): string {
  const meta = FIELD_META[field] as { kind: string; options?: readonly (readonly [string, string])[] };
  if (!value) return "";
  if (meta.kind === "select") return optionLabel(meta.options ?? [], value);
  if (meta.kind === "date") return brDate(value);
  if (meta.kind === "cpf") return formatCpf(value);
  if (field === "phone" || field === "whatsapp") return formatPhone(value);
  return value;
}

// Reduz a foto para um quadrado de 512px em JPEG (centro da imagem).
async function squareJpeg(file: File, size: number): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("Não consegui ler essa imagem. Use JPG, PNG ou WebP.");
  }
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")?.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("Não consegui preparar a imagem."))), "image/jpeg", 0.85));
}

const sameAddress = (d: PersonDetail, f: Family): boolean =>
  d.values.line1 === f.line1 && d.values.line2 === f.line2 && d.values.city === f.city && d.values.state === f.state && d.values.postalCode === f.postalCode;
const familyAddress = (f: Family): string =>
  [[f.line1, f.line2].filter(Boolean).join(", "), [f.city, f.state].filter(Boolean).join("/"), f.postalCode].filter(Boolean).join(" · ");

export function PersonProfile({
  detail,
  people,
  canEdit,
  canDocs,
  canFinance,
  focusName,
  update,
  patchList,
  onOpenPerson,
}: {
  detail: PersonDetail;
  people: PersonListItem[];
  canEdit: boolean;
  canDocs: boolean;
  canFinance: boolean;
  focusName: number;
  update: (id: string, fn: (d: PersonDetail) => PersonDetail) => void;
  patchList: (id: string, patch: Partial<PersonListItem>) => void;
  onOpenPerson: (id: string) => void;
}) {
  const id = detail.id;
  const v = detail.values;
  const [saved, setSaved] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [exiting, setExiting] = useState(false);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [exitErr, setExitErr] = useState("");
  const [addrErr, setAddrErr] = useState("");
  const savedTimer = useRef<number | undefined>(undefined);
  const file = useRef<HTMLInputElement>(null);
  const now = useRef(new Date());

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  function flash() {
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), SAVED_MS);
  }

  async function save(field: PersonField, raw: string): Promise<string | null> {
    const r = await updatePersonFieldAction(id, field, raw);
    if (!r.success) return r.message;
    const text = r.data.text;
    update(id, (d) => ({ ...d, values: { ...d.values, [field]: text } }));
    const patch: Partial<PersonListItem> = {};
    if (field === "name") patch.name = text;
    else if (field === "phone") patch.phone = text;
    else if (field === "whatsapp") patch.whatsapp = text;
    else if (field === "email") patch.email = text;
    else if (field === "birthDate") patch.birthDate = text || null;
    else if (field === "office") patch.office = text;
    else if (field === "status") patch.status = text as Relationship;
    if (Object.keys(patch).length) patchList(id, patch);
    flash();
    return null;
  }

  const F = (field: PersonField, extra?: { extra?: ReactNode; suggestions?: readonly string[]; display?: ReactNode }) => (
    <Field field={field} value={v[field]} canEdit={canEdit} onSave={save} display={extra?.display ?? show(field, v[field])} extra={extra?.extra} suggestions={extra?.suggestions} />
  );
  const any = (...fields: PersonField[]) => canEdit || fields.some((f) => v[f]);

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setPhotoErr("");
    try {
      const blob = await squareJpeg(f, 512);
      const prep = await preparePhotoAction(id);
      if (!prep.success) throw new Error(prep.message);
      const up = await createClient().storage.from(PHOTO_BUCKET).uploadToSignedUrl(prep.data.path, prep.data.token, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error("Não consegui enviar a foto. Tente de novo.");
      const r = await attachPhotoAction(id, prep.data.path);
      if (!r.success) throw new Error(r.message);
      update(id, (d) => ({ ...d, photoUrl: r.data.url }));
      patchList(id, { photoUrl: r.data.url });
      flash();
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : "Não consegui trocar a foto.");
    }
    if (file.current) file.current.value = "";
  }

  async function registerExit(close: () => void) {
    setExitErr("");
    const r = await registerExitAction(id, exitDate, exitReason);
    if (!r.success) return void setExitErr(r.message);
    update(id, (d) => ({ ...d, values: { ...d.values, exitDate, exitReason, status: "inactive" } }));
    patchList(id, { status: "inactive" });
    setExiting(false);
    close();
    flash();
  }
  async function toggleArchive(close: () => void) {
    const next = !detail.archived;
    const r = await setArchivedAction(id, next);
    close();
    if (!r.success) return;
    update(id, (d) => ({ ...d, archived: next }));
    patchList(id, { archived: next });
    flash();
  }
  async function shareAddress() {
    setAddrErr("");
    const r = await shareFamilyAddressAction(id);
    if (!r.success) return void setAddrErr(r.message);
    update(id, (d) => ({ ...d, family: r.data }));
    flash();
  }

  const family = detail.family;
  const hasOwnAddress = Boolean(v.line1 || v.line2 || v.city || v.state || v.postalCode);
  const showFamilyAddress = Boolean(family && !hasOwnAddress && familyAddress(family));
  const meta = [detail.archived ? "Arquivado" : relLabel(statusValue(v.status) as Relationship), v.office, ageLabel(v.birthDate, now.current)].filter(Boolean).join(" · ");
  const hasExit = Boolean(v.exitDate || v.exitReason);
  const photo = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {detail.photoUrl ? <img src={detail.photoUrl} alt="" /> : initialsOf(v.name)}
    </>
  );

  return (
    <article className={styles.prof}>
      <div className={styles.profBar}>
        <span className={`${styles.saved}${saved ? " " + styles.savedOn : ""}`} aria-live="polite">{saved ? "Salvo" : ""}</span>
        <Link href={`/people/${id}/ficha`} className="link">Imprimir ficha</Link>
        {v.baptismDate ? <Link href={`/people/${id}/batismo`} className="link">Certificado de batismo</Link> : null}
        {canEdit ? (
          <Popover trigger={<UiIcon icon={MoreHorizontal} />} triggerClass="iconbtn" label="Mais ações da pessoa" align="right">
            {(close) =>
              exiting ? (
                <div className={styles.exitForm}>
                  <label className={styles.exitLabel}>
                    Data da saída
                    <DateField value={exitDate} onChange={setExitDate} aria-label="Data da saída" />
                  </label>
                  <label className={styles.exitLabel}>
                    Motivo
                    <Select value={exitReason} onChange={(e) => setExitReason(e.target.value)} aria-label="Motivo da saída">
                      <option value="">Escolha o motivo</option>
                      {EXIT_OPTIONS.map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </Select>
                  </label>
                  {exitErr ? <p className={styles.fErr} role="alert">{exitErr}</p> : null}
                  <div className={styles.exitActions}>
                    <button type="button" className={styles.primary} onClick={() => void registerExit(close)}>Registrar saída</button>
                    <button type="button" className="btn ghost sm" onClick={() => setExiting(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={studyStyles.mi}
                    onClick={() => {
                      setExitDate(new Date().toISOString().slice(0, 10));
                      setExitReason("");
                      setExitErr("");
                      setExiting(true);
                    }}
                  >
                    Registrar saída
                  </button>
                  <button type="button" role="menuitem" className={studyStyles.mi} onClick={() => void toggleArchive(close)}>
                    {detail.archived ? "Desarquivar" : "Arquivar"}
                  </button>
                </>
              )
            }
          </Popover>
        ) : null}
      </div>

      <header className={styles.ph}>
        {canEdit ? (
          <>
            <button type="button" className={styles.photo} onClick={() => file.current?.click()} aria-label="Trocar a foto">{photo}</button>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </>
        ) : (
          <span className={styles.photo} aria-hidden="true">{photo}</span>
        )}
        <div className={styles.phMain}>
          <Field field="name" value={v.name} canEdit={canEdit} onSave={save} title autoEdit={focusName} />
          <p className={styles.phMeta}>{meta}</p>
        </div>
      </header>
      {photoErr ? <p className={styles.fErr} role="alert">{photoErr}</p> : null}

      {any("phone", "whatsapp", "email") ? (
        <section className={styles.sec} aria-labelledby="sec-contact">
          <h2 id="sec-contact" className={styles.secTitle}>Contato</h2>
          {F("phone")}
          {F("whatsapp", { extra: v.whatsapp ? <a className="link" href={whatsappLink(v.whatsapp)} target="_blank" rel="noreferrer">Abrir conversa</a> : null })}
          {F("email")}
        </section>
      ) : null}

      {any("birthDate", "gender", "maritalStatus", "profession") ? (
        <section className={styles.sec} aria-labelledby="sec-personal">
          <h2 id="sec-personal" className={styles.secTitle}>Dados pessoais</h2>
          {F("birthDate", { display: v.birthDate ? [brDate(v.birthDate), ageLabel(v.birthDate, now.current)].filter(Boolean).join(" · ") : undefined })}
          {F("gender")}
          {F("maritalStatus")}
          {F("profession")}
        </section>
      ) : null}

      {canDocs && any("cpf", "rg") ? (
        <section className={styles.sec} aria-labelledby="sec-docs">
          <h2 id="sec-docs" className={styles.secTitle}>Documentos</h2>
          {F("cpf")}
          {F("rg")}
        </section>
      ) : null}

      {any("line1", "line2", "city", "state", "postalCode") || showFamilyAddress ? (
        <section className={styles.sec} aria-labelledby="sec-address">
          <h2 id="sec-address" className={styles.secTitle}>Endereço</h2>
          {showFamilyAddress && family ? (
            <div className={styles.fRow}>
              <span className={styles.fLabel}>Endereço</span>
              <div className={styles.fVal}>
                <span>{familyAddress(family)}</span>
                <span className={styles.fNote}>Endereço da família</span>
              </div>
            </div>
          ) : null}
          {F("line1")}
          {F("line2")}
          {F("city")}
          {F("state")}
          {F("postalCode")}
          {canEdit && family && hasOwnAddress && !sameAddress(detail, family) ? (
            <button type="button" className={`link ${styles.famAdd}`} onClick={() => void shareAddress()}>Usar este endereço para todos da família</button>
          ) : null}
          {addrErr ? <p className={styles.fErr} role="alert">{addrErr}</p> : null}
        </section>
      ) : null}

      <FamilySection
        key={id}
        personId={id}
        family={family}
        people={people}
        canEdit={canEdit}
        onOpenPerson={onOpenPerson}
        onFamily={(f) => update(id, (d) => ({ ...d, family: f }))}
        onSaved={flash}
      />

      <section className={styles.sec} aria-labelledby="sec-church">
        <h2 id="sec-church" className={styles.secTitle}>Vida na igreja</h2>
        {F("status")}
        {F("firstVisit")}
        {F("conversionDate")}
        {F("baptismDate")}
        {F("admissionType")}
        {F("membershipDate")}
        {F("office", { suggestions: OFFICE_SUGGESTIONS })}
        {canEdit || v.isLeader === "true" ? F("isLeader") : null}
        {hasExit ? F("exitDate") : null}
        {hasExit ? F("exitReason") : null}
      </section>

      {canFinance && detail.tithes ? (
        <section className={styles.sec} aria-labelledby="sec-tithes">
          <h2 id="sec-tithes" className={styles.secTitle}>Dízimos</h2>
          <p className={styles.tithes}>
            {detail.tithes.count > 0
              ? `${detail.tithes.year}: ${money(detail.tithes.total, detail.tithes.currency)} em ${detail.tithes.count} ${detail.tithes.count === 1 ? "contribuição" : "contribuições"}`
              : `${detail.tithes.year}: nenhuma contribuição ainda`}
          </p>
          <Link href="/finance?tab=dizimos" className="link">Ver em Finanças</Link>
        </section>
      ) : null}
    </article>
  );
}
