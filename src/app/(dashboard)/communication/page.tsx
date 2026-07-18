import { requireOrg } from "@/lib/auth/session";
import { canSendCommunication } from "@/features/communication/access";
import {
  listAudienceOptions,
  listManualSticks,
  listMessages,
  listTemplates,
} from "@/features/communication/queries";
import { CommunicationBoard } from "@/features/communication/components/CommunicationBoard";

// Comunicação (Server Component). Área SENSÍVEL: só quem tem communication.send
// entra — o RLS é a barreira real; aqui a UI dá o recado claro a quem não pode.
export default async function CommunicationPage() {
  const ctx = await requireOrg();

  if (!canSendCommunication(ctx)) {
    return (
      <>
        <h1 className="page">Comunicação</h1>
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Esta área é restrita a quem envia comunicações da igreja.
            <br />
            <span className="muted">Peça acesso a quem administra a comunicação.</span>
          </div>
        </div>
      </>
    );
  }

  const { supabase, orgId } = ctx;
  const [options, manualSticks, templates, messages] = await Promise.all([
    listAudienceOptions(supabase, orgId),
    listManualSticks(supabase, orgId),
    listTemplates(supabase, orgId),
    listMessages(supabase, orgId),
  ]);

  return (
    <CommunicationBoard options={options} manualSticks={manualSticks} templates={templates} messages={messages} />
  );
}
