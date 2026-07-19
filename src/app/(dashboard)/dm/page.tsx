import Link from "next/link";
import { requireOrg } from "@/lib/auth/session";
import { listDmCandidates, listThreads } from "@/features/dm/queries";
import { NewConversation } from "@/features/dm/components/NewConversation";
import { agoLabel, initials } from "@/lib/utils/date";
import styles from "@/features/dm/dm.module.css";

// Lista de conversas (Server Component). Threads do usuário logado, mais recentes
// primeiro, com o nome do outro, a prévia da última mensagem e o selo de não-lidas. O RLS
// é SÓ-PARTICIPANTE — só vejo as minhas. "Nova conversa" escolhe entre quem tem conta.
export default async function DmPage() {
  const { supabase, orgId, user } = await requireOrg();

  const [threads, candidates] = await Promise.all([
    listThreads(supabase, orgId, user.id),
    listDmCandidates(supabase, orgId, user.id),
  ]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">Mensagens</h1>
          <p className="sub" style={{ margin: 0 }}>
            Conversas reservadas, um a um, com a equipe da igreja.
          </p>
        </div>
        <NewConversation candidates={candidates} />
      </div>

      {threads.length === 0 ? (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Você ainda não tem conversas.
            <br />
            <span className="muted">Comece uma com “Nova conversa”.</span>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className={styles.threadList}>
            {threads.map((t) => {
              const unread = t.unreadCount > 0;
              const preview = t.preview
                ? (t.lastSenderId === user.id ? "Você: " : "") + t.preview
                : "Conversa iniciada";
              return (
                <Link key={t.id} href={`/dm/${t.id}`} className={styles.threadRow}>
                  <span className={styles.avatar}>{initials(t.otherName)}</span>
                  <div className={styles.threadMain}>
                    <div className={styles.threadTop}>
                      <span className={styles.threadName}>{t.otherName}</span>
                      {t.lastMessageAt ? (
                        <span className={styles.threadWhen}>{agoLabel(t.lastMessageAt)}</span>
                      ) : null}
                    </div>
                    <div className={`${styles.threadPreview}${unread ? " " + styles.unreadPreview : ""}`}>
                      {preview}
                    </div>
                  </div>
                  {unread ? <span className={styles.badge}>{t.unreadCount}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
