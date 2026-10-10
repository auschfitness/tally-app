// Páginas de impressão de uma pessoa (spec 13, B4): ficha cadastral (A4) e certificado de
// batismo (A4 paisagem). Sem estado: o texto vem de print.ts; o botão Imprimir está em PrintBar.
import Link from "next/link";
import { ageLabel, initialsOf, relLabel, type Relationship } from "../domain";
import { baptismText, fichaSections, type Church } from "../print";
import type { PersonDetail } from "../types";
import { PrintBar } from "./PrintBar";
import styles from "../print.module.css";

function Sign({ label }: { label: string }) {
  return (
    <div className={styles.signBox}>
      <span className={styles.signLine} />
      <span className={styles.signLabel}>{label}</span>
    </div>
  );
}

export function FichaView({ detail, church }: { detail: PersonDetail; church: Church }) {
  const v = detail.values;
  const now = new Date();
  const sections = fichaSections(detail, now);
  const meta = [detail.archived ? "Arquivado" : relLabel(v.status as Relationship), v.office, ageLabel(v.birthDate, now)].filter(Boolean).join(" · ");
  return (
    <div className={styles.wrap}>
      <PrintBar backHref={`/people/${detail.id}`} />
      <article className={styles.sheet}>
        <header className={styles.head}>
          <p className={styles.church}>{church.name}</p>
          <h1 className={styles.title}>Ficha cadastral</h1>
        </header>
        <div className={styles.person}>
          <span className={styles.photo} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {detail.photoUrl ? <img src={detail.photoUrl} alt="" /> : initialsOf(v.name)}
          </span>
          <div>
            <p className={styles.name}>{v.name}</p>
            <p className={styles.meta}>{meta}</p>
          </div>
        </div>
        <div className={styles.cols}>
          {sections.map((s) => (
            <section key={s.title} className={styles.sec}>
              <h2 className={styles.secTitle}>{s.title}</h2>
              <dl className={styles.rows}>
                {s.rows.map(([label, value], i) => (
                  <div key={`${label}-${i}`} className={styles.row}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className={styles.sign}>
          <Sign label="Assinatura" />
          <Sign label="Data" />
        </footer>
      </article>
    </div>
  );
}

export function BaptismView({ detail, church }: { detail: PersonDetail; church: Church }) {
  const v = detail.values;
  if (!v.baptismDate) {
    return (
      <div className={styles.wrap}>
        <PrintBar backHref={`/people/${detail.id}`} />
        <p className="muted">
          {v.name} ainda não tem data de batismo. Preencha o campo Batismo na{" "}
          <Link href={`/people/${detail.id}`} className="link">ficha</Link> para gerar o certificado.
        </p>
      </div>
    );
  }
  const t = baptismText(v.name, v.gender, v.baptismDate, church);
  return (
    <div className={styles.wrap}>
      <PrintBar backHref={`/people/${detail.id}`} />
      <article className={`${styles.sheet} ${styles.cert}`}>
        <div className={styles.certFrame}>
          <p className={styles.certKicker}>{church.name}</p>
          <h1 className={styles.certTitle}>Certificado de batismo</h1>
          <p className={styles.certText}>
            {t.before} <strong className={styles.certName}>{t.name}</strong> {t.after}
          </p>
          <div className={styles.certSigns}>
            <Sign label="Pastor(a)" />
            <Sign label="Secretário(a)" />
          </div>
        </div>
      </article>
    </div>
  );
}
