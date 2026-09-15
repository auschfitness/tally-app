"use client";

// Biblioteca de Sermões — spec 06, Erro nº 2. Atrás da flag `study.library_v2`; a
// versão de hoje (SermonLibrary.tsx) fica intocada ao lado.
//
// Cada elemento responde a uma pergunta que o pastor faz de verdade:
//   h1 "Estudo"            → onde eu estou?
//   "+ Novo sermão"        → como começo o de domingo? (ÚNICA ação primária)
//   bloco "Continuando"    → onde eu parei?
//     ↳ passagem/série/data → sobre o quê, de que série, para quando?
//     ↳ o que falta         → o que ainda me falta antes de domingo?
//   busca                  → onde está aquele sermão sobre o Bom Pastor?
//   filtro de status       → quero ver os pregados/arquivados também?
//   linha da lista         → qual sermão, sobre que texto, de que série, quando?
//     ↳ coluna de estado    → em que ponto está? (só quando a lista MISTURA estados)
//     ↳ campus              → de qual campus? (só quando a igreja tem mais de um)
// Sem gráfico: a igreja tem dezenas de sermões, não milhares — lista é a forma certa.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/shared/Select";
import { OPEN_STATUSES, SERMON_STATUSES, STATUS_LBL, inProgressSermon, missingParts, searchSermons } from "../domain";
import type { Sermon, SermonStatus, Series } from "../types";
import { brDateCompact } from "@/lib/utils/date";
import styles from "../study.module.css";

// O filtro é UM controle e faz UMA coisa: status. Série tem casa própria
// (/study/series) e a busca já encontra por nome de série.
type StatusFilter = "open" | "all" | SermonStatus;
const OPEN = new Set<SermonStatus>(OPEN_STATUSES);

export function SermonLibraryV2({
  sermons,
  series,
  campuses,
}: {
  sermons: Sermon[];
  series: Series[];
  campuses: string[];
}) {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [q, setQ] = useState("");

  const seriesTitleById = useMemo(() => new Map(series.map((s) => [s.id, s.title || "(sem título)"])), [series]);
  const cont = useMemo(() => inProgressSermon(sermons), [sermons]);

  const searching = q.trim().length > 0;
  // A busca IGNORA o filtro: quem digita "Bom Pastor" quer o sermão, esteja ele
  // pregado, arquivado ou em rascunho. Um resultado escondido por um filtro que a
  // pessoa esqueceu que estava ligado é a pior resposta possível.
  const list = searching
    ? searchSermons(sermons, q, seriesTitleById)
    : sermons.filter((s) => (status === "all" ? true : status === "open" ? OPEN.has(s.status) : s.status === status));

  // Um único status escolhido → a coluna diria a mesma palavra em toda linha. Isso
  // não é informação, é ruído: ela sai. Buscando, a lista mistura estados → volta.
  const showState = searching || status === "open" || status === "all";
  const showCampus = campuses.length > 1;

  function meta(s: Sermon): string {
    return [
      s.main_passage,
      s.series_id ? seriesTitleById.get(s.series_id) : "",
      showCampus ? s.campus : "",
      brDateCompact(s.sermon_date),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className={styles.lib}>
      <div className={styles.libHeader}>
        <div className={styles.libHeaderText}>
          <h1 className="page">Estudo</h1>
          <p className="sub" style={{ margin: 0 }}>Onde a igreja prepara e preserva o ensino.</p>
        </div>
        <Link href="/study/sermon/new" className={`btn ${styles.libAction}`}>+ Novo sermão</Link>
      </div>

      {cont ? (
        <Link href={`/study/sermon/${cont.id}`} className={styles.cont}>
          <span className={styles.contLabel}>Continuando</span>
          <span className={styles.contTitle}>{cont.title || "(sem título)"}</span>
          {meta(cont) ? <span className={styles.contMeta}>{meta(cont)}</span> : null}
          {missingParts(cont).length ? <span className={styles.contMissing}>{missingParts(cont).join(" · ")}</span> : null}
        </Link>
      ) : null}

      <div className={styles.libBar}>
        <input
          className={`searchbox ${styles.libSearch}`}
          type="search"
          placeholder="Buscar sermão"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select compact value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filtrar por estado">
          <option value="open">Em aberto</option>
          <option value="all">Todos</option>
          {SERMON_STATUSES.map((st) => (
            <option key={st} value={st}>{STATUS_LBL[st]}</option>
          ))}
        </Select>
      </div>

      {searching ? (
        <div className={styles.libCount}>
          {list.length} {list.length === 1 ? "resultado" : "resultados"} para “{q.trim()}”
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="empty">
          {searching
            ? `Nada encontrado para “${q.trim()}”.`
            : status === "open"
              ? "Nenhum sermão em aberto. Comece o próximo em “+ Novo sermão”."
              : "Nenhum sermão neste estado."}
        </div>
      ) : (
        // `key` no container: mudar o filtro remonta a lista, e ela reentra com um
        // fade curto em vez de trocar de conteúdo num corte seco.
        <div key={searching ? "q" : status} className={`${styles.rows} ${styles.rowsIn}`}>
          {list.map((s) => (
            <Link key={s.id} href={`/study/sermon/${s.id}`} className={styles.row}>
              <span className={styles.rowHead}>
                <span className={styles.rowTitle}>{s.title || "(sem título)"}</span>
                {showState ? <span className={styles.rowState}>{STATUS_LBL[s.status]}</span> : null}
              </span>
              {meta(s) ? <span className={styles.rowMeta}>{meta(s)}</span> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
