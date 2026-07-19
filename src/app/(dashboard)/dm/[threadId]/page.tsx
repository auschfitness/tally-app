import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { getThread } from "@/features/dm/queries";
import { Conversation } from "@/features/dm/components/Conversation";
import { readAccount } from "@/features/settings/domain";
import { zonedTodayIso } from "@/lib/utils/date";
import styles from "@/features/dm/dm.module.css";

// A conversa aberta (Server Component). Carrega a thread (o RLS barra se não for minha —
// getThread devolve null → notFound). O "hoje" para os separadores de dia vem do fuso da
// organização (não do servidor SSR em UTC). O envio/leitura/exclusão vivem no client.
export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { supabase, orgId, user } = await requireOrg();

  const [thread, stateRes] = await Promise.all([
    getThread(supabase, orgId, user.id, threadId),
    supabase.from("app_state").select("data").eq("org_id", orgId).maybeSingle(),
  ]);
  if (!thread) notFound();

  const todayIso = zonedTodayIso(readAccount(stateRes.data?.data).timezone);

  return (
    <>
      <div className={styles.convHead}>
        <Link href="/dm" className={styles.backLink}>
          ← Mensagens
        </Link>
      </div>
      <h1 className="page" style={{ marginBottom: 12 }}>
        {thread.otherName}
      </h1>

      <Conversation
        threadId={thread.id}
        otherName={thread.otherName}
        messages={thread.messages}
        myId={user.id}
        todayIso={todayIso}
      />
    </>
  );
}
