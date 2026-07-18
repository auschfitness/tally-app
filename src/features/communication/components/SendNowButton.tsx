"use client";

// Ação primária "Enviar agora" (Client). Dispara a Server Action sendMessage, que
// invoca a edge function. Em sucesso, revalidatePath já atualiza o Server Component;
// router.refresh() re-renderiza o detalhe (os status por destinatário e o status da
// mensagem passam a refletir a entrega). Sem polling.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "../actions";
import type { SendOutcome } from "../types";

export function SendNowButton({ messageId, pending }: { messageId: string; pending: number }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<SendOutcome | null>(null);

  async function onSend() {
    setSending(true);
    setErr(null);
    const res = await sendMessage(messageId);
    setSending(false);
    if (res.success) {
      setDone(res.data);
      router.refresh();
    } else {
      setErr(res.message);
    }
  }

  return (
    <div>
      <button className="btn" type="button" onClick={onSend} disabled={sending}>
        {sending ? "Enviando…" : `Enviar agora (${pending})`}
      </button>
      {err ? <div className="gerr" style={{ marginTop: 10 }}>{err}</div> : null}
      {done ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          Entrega disparada · {done.sent} enviado(s)
          {done.failed > 0 ? ` · ${done.failed} falhou(aram)` : ""}.
        </div>
      ) : null}
    </div>
  );
}
