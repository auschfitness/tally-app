"use client";

// Gestão de convites (Client). Pendentes (link + copiar + revogar), expirados (gerar novo
// link), aceitos e revogados (histórico). O link é montado no cliente (origin + token). As
// ações vão por Server Actions; o RLS (members.manage) é a barreira real.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateInvite, revokeInvite } from "../actions";
import { inviteUrl, partitionInvites } from "../domain";
import { brDate } from "@/lib/utils/date";
import type { InviteView } from "../types";
import styles from "../invites.module.css";

function LinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={styles.linkRow}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <button className="btn ghost" type="button" onClick={copy}>
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

export function InvitesManager({ invites }: { invites: InviteView[] }) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string>("");
  const [newLinks, setNewLinks] = useState<Record<string, string>>({}); // por invite regenerado
  const [err, setErr] = useState<string | null>(null);

  // origin só existe no cliente (o link não faz sentido no SSR).
  useEffect(() => setOrigin(window.location.origin), []);

  const { pending, expired, accepted, revoked } = partitionInvites(invites);

  async function onRevoke(id: string) {
    setConfirmRevoke("");
    setBusyId(id);
    setErr(null);
    const res = await revokeInvite(id);
    setBusyId(null);
    if (res.success) router.refresh();
    else setErr(res.message);
  }

  async function onRegenerate(id: string) {
    setBusyId(id);
    setErr(null);
    const res = await regenerateInvite(id);
    setBusyId(null);
    if (res.success) {
      setNewLinks((cur) => ({ ...cur, [id]: inviteUrl(origin, res.data.token) }));
      router.refresh();
    } else {
      setErr(res.message);
    }
  }

  const nothing = invites.length === 0;

  return (
    <>
      {err ? <div className="gerr" style={{ marginBottom: 10 }}>{err}</div> : null}

      {nothing ? (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Nenhum convite ainda.
            <br />
            <span className="muted">
              Convide alguém abrindo a ficha da pessoa em <b>Sticks</b> (ela precisa de e-mail).
            </span>
          </div>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Pendentes</div>
          <div className="panel">
            <div className={styles.list}>
              {pending.map((i) => (
                <div key={i.id} className={styles.row} style={{ flexWrap: "wrap" }}>
                  <div className={styles.main}>
                    <div className={styles.name}>{i.personName}</div>
                    <div className={styles.meta}>
                      {i.email} · expira {brDate(i.expiresAt.slice(0, 10))}
                    </div>
                    <LinkBox url={inviteUrl(origin, i.token)} />
                  </div>
                  <div className={styles.rowActions}>
                    {confirmRevoke === i.id ? (
                      <>
                        <span className="muted" style={{ fontSize: 12.5 }}>Revogar?</span>
                        <button className="link" type="button" onClick={() => onRevoke(i.id)}>Sim</button>
                        <button className="link" type="button" onClick={() => setConfirmRevoke("")}>Não</button>
                      </>
                    ) : (
                      <button
                        className="link"
                        type="button"
                        disabled={busyId === i.id}
                        onClick={() => setConfirmRevoke(i.id)}
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {expired.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Expirados</div>
          <div className="panel">
            <div className={styles.list}>
              {expired.map((i) => (
                <div key={i.id} className={styles.row} style={{ flexWrap: "wrap" }}>
                  <div className={styles.main}>
                    <div className={styles.name}>{i.personName}</div>
                    <div className={styles.meta}>{i.email} · expirou {brDate(i.expiresAt.slice(0, 10))}</div>
                    {newLinks[i.id] ? <LinkBox url={newLinks[i.id]!} /> : null}
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      className="link"
                      type="button"
                      disabled={busyId === i.id}
                      onClick={() => onRegenerate(i.id)}
                    >
                      {busyId === i.id ? "Gerando…" : "Gerar novo link"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {accepted.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Aceitos</div>
          <div className="panel">
            <div className={styles.list}>
              {accepted.map((i) => (
                <div key={i.id} className={styles.row}>
                  <div className={styles.main}>
                    <div className={styles.name}>{i.personName}</div>
                    <div className={styles.meta}>
                      {i.email}
                      {i.acceptedAt ? ` · aceito em ${brDate(i.acceptedAt.slice(0, 10))}` : ""}
                    </div>
                  </div>
                  <span className="chip member">app</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {revoked.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Revogados</div>
          <div className="panel">
            <div className={styles.list}>
              {revoked.map((i) => (
                <div key={i.id} className={styles.row}>
                  <div className={styles.main}>
                    <div className={styles.name}>{i.personName}</div>
                    <div className={styles.meta}>{i.email}</div>
                  </div>
                  <span className="muted" style={{ fontSize: 12.5 }}>revogado</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
