"use client";

// Aba de feature flags do painel super-admin. Flag = gate de MATURIDADE ("está pronto?"),
// diferente do plano ("pagou?"), que fica na aba Igrejas. Fluxo esperado: ligar na igreja
// de teste (override), validar, só então levar o alcance global para "Todas as igrejas".
// Toda escrita vai por Server Action; o is_platform_admin() dentro da RPC é a barreira real.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import type { ActionResult } from "@/lib/errors";
import { ROLLOUT_LABELS, ROLLOUT_ORDER, globalOn } from "@/features/flags/catalog";
import { setFlagAction, setFlagOrgAction } from "../actions";
import type { AdminFlag, AdminOrg } from "../types";
import styles from "../admin.module.css";

export function FlagsPanel({ flags, orgs }: { flags: AdminFlag[]; orgs: AdminOrg[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Busca de igreja: filtra as opções do seletor (a lista é a mesma da aba Igrejas).
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? orgs.filter((o) => o.name.toLowerCase().includes(q)) : orgs;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [orgs, query]);

  const selected = orgs.find((o) => o.orgId === orgId) ?? null;

  async function run(key: string, action: () => Promise<ActionResult>) {
    setBusy(key);
    setErr(null);
    const res = await action();
    setBusy(null);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  return (
    <>
      <div>
        <h1 className="page">Feature flags</h1>
        <p className="sub" style={{ margin: 0 }}>
          Gate de maturidade: o que já está pronto para aparecer. Diferente do plano, que é o gate
          comercial. Um módulo só aparece se a flag está ligada <em>e</em> o plano libera.
        </p>
      </div>

      {err ? <div className={`gerr ${styles.err}`}>{err}</div> : null}

      <div className={styles.toolbar} style={{ marginTop: 18 }}>
        <input
          className={styles.search}
          type="search"
          placeholder="Buscar igreja pelo nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar igreja"
        />
        <Select
          compact
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          aria-label="Igreja para ligar ou desligar a flag"
        >
          <option value="">Nenhuma igreja escolhida</option>
          {matches.map((o) => (
            <option key={o.orgId} value={o.orgId}>
              {o.name}
            </option>
          ))}
        </Select>
        <span className={styles.resultCount}>
          {selected ? `Editando: ${selected.name}` : "Escolha uma igreja para ligar caso a caso"}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Flag</th>
              <th>O que é</th>
              <th>Alcance global</th>
              <th>{selected ? "Nesta igreja" : "Por igreja"}</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => {
              const override = selected ? f.overrides[selected.orgId] : undefined;
              const inherited = globalOn(f);
              const effective = override ?? inherited;
              const overrideCount = Object.values(f.overrides).filter(Boolean).length;

              return (
                <tr key={f.key}>
                  <td className={styles.orgName}>{f.key}</td>
                  <td className={styles.muted2}>{f.description}</td>
                  <td>
                    <Select
                      compact
                      value={f.rollout}
                      disabled={busy === f.key}
                      onChange={(e) => run(f.key, () => setFlagAction(f.key, e.target.value))}
                      aria-label={`Alcance global de ${f.key}`}
                    >
                      {ROLLOUT_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {ROLLOUT_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    {selected ? (
                      <div className={styles.rowActions} style={{ justifyContent: "flex-start" }}>
                        <span className={styles.confirmTxt}>
                          {override === undefined
                            ? `Herda do global: ${inherited ? "ligada" : "desligada"}`
                            : override
                              ? "Ligada só aqui"
                              : "Desligada só aqui"}
                        </span>
                        <button
                          className="link"
                          type="button"
                          disabled={busy === f.key || effective === true}
                          onClick={() => run(f.key, () => setFlagOrgAction(f.key, selected.orgId, true))}
                        >
                          Ligar
                        </button>
                        <button
                          className="link"
                          type="button"
                          disabled={busy === f.key || effective === false}
                          onClick={() => run(f.key, () => setFlagOrgAction(f.key, selected.orgId, false))}
                        >
                          Desligar
                        </button>
                      </div>
                    ) : (
                      <span className={styles.muted2}>
                        {overrideCount > 0 ? `${overrideCount} igreja(s) com override` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ marginTop: 14 }}>
        O override por igreja vence o alcance global. Uma vez definido, ele fica — para a igreja
        voltar a seguir o global é preciso remover a linha no banco.
      </p>
    </>
  );
}
