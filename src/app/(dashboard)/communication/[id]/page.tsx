import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { brDate } from "@/lib/utils/date";
import { canSendCommunication } from "@/features/communication/access";
import { getMessageDetail } from "@/features/communication/queries";
import { audienceLabel, isSendable, messageStatusLabel, recipientStatusLabel } from "@/features/communication/domain";
import { SendNowButton } from "@/features/communication/components/SendNowButton";

// Detalhe de uma mensagem (Server Component) — o registro no app: cabeçalho + os
// destinatários com status. Gated por communication.send (o RLS é a barreira real).
export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  const { id } = await params;

  if (!canSendCommunication(ctx)) {
    return (
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="empty">Esta área é restrita a quem envia comunicações da igreja.</div>
      </div>
    );
  }

  const detail = await getMessageDetail(ctx.supabase, ctx.orgId, id);
  if (!detail) notFound();
  const { message, recipients } = detail;

  const receiving = recipients.filter((r) => r.status === "pending" || r.status === "sent").length;
  const skipped = recipients.filter((r) => r.status === "skipped").length;
  const pending = recipients.filter((r) => r.status === "pending").length;
  const sendable = isSendable(message.status, pending);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <h1 className="page" style={{ marginRight: "auto" }}>{message.subject}</h1>
        <Link href="/communication" className="link">← Voltar</Link>
      </div>

      <div className="ministrip" style={{ marginTop: 8 }}>
        <div>
          <div className="mi-k">Status</div>
          <div className="mi-v">{messageStatusLabel(message.status)}</div>
        </div>
        <div>
          <div className="mi-k">Público</div>
          <div className="mi-v">{audienceLabel(message.audienceKind)}</div>
        </div>
        <div>
          <div className="mi-k">Recebem</div>
          <div className="mi-v pos">{receiving}</div>
        </div>
        <div>
          <div className="mi-k">Pulados</div>
          <div className="mi-v">{skipped}</div>
        </div>
        <div>
          <div className="mi-k">Registrada em</div>
          <div className="mi-v">{brDate(message.createdAt.slice(0, 10))}</div>
        </div>
      </div>

      {sendable ? (
        <div
          className="panel"
          style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <div style={{ marginRight: "auto" }}>
            <b>Preparada — ainda não enviada.</b>
            <div className="muted" style={{ fontSize: 13, marginTop: 2, lineHeight: 1.6 }}>
              {pending} destinatário(s) na fila. “Enviar agora” dispara a entrega dos e-mails.
            </div>
          </div>
          <SendNowButton messageId={message.id} pending={pending} />
        </div>
      ) : null}

      <div className="row2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="ph"><h3>Destinatários</h3></div>
          <table style={{ border: "none" }}>
            <tbody>
              <tr>
                <th>Pessoa</th>
                <th>E-mail</th>
                <th>Situação</th>
              </tr>
              {recipients.length === 0 ? (
                <tr><td colSpan={3} className="empty">Sem destinatários.</td></tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.name || <span className="muted">—</span>}</b></td>
                    <td><span className="muted">{r.email || "—"}</span></td>
                    <td>
                      {recipientStatusLabel(r.status)}
                      {r.error ? <span className="muted"> · {r.error}</span> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="ph"><h3>Conteúdo</h3></div>
          {message.subject ? (
            <div style={{ marginBottom: 10 }}>
              <div className="mi-k">Assunto</div>
              <div style={{ fontWeight: 600 }}>{message.subject}</div>
            </div>
          ) : null}
          <div className="mi-k">Mensagem</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 4 }}>{message.body}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
            Preparar uma mensagem só registra os destinatários; a entrega dos e-mails acontece ao
            usar “Enviar agora”. O <code>{"{nome}"}</code> é aplicado por destinatário no envio.
          </div>
        </div>
      </div>
    </>
  );
}
