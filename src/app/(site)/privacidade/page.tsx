import type { Metadata } from "next";
import { SiteNav, SiteFooter, SITE } from "../Landing";
import s from "../site.module.css";

export const metadata: Metadata = { title: "Privacidade · Mercy" };

export default function PrivacidadePage() {
  return (
    <div className={s.page}>
      <SiteNav lang="pt" />
      <div className={s.wrap}>
        <article className={s.doc}>
          <h1>Política de privacidade</h1>
          <p className={s.meta}>Última atualização: 6 de outubro de 2026</p>
          <h2>O que coletamos</h2>
          <p>Para a conta: nome e e-mail. Para o uso do serviço: os dados que a própria organização cadastra sobre as pessoas da igreja, e registros técnicos de acesso (data, hora, endereço IP) necessários para segurança.</p>
          <h2>Para que usamos</h2>
          <ul>
            <li>Operar o serviço contratado pela organização.</li>
            <li>Manter a segurança das contas e dos dados.</li>
            <li>Enviar avisos sobre a conta (convites, recuperação de senha, manutenção).</li>
          </ul>
          <p>Não usamos os dados para publicidade, não vendemos e não compartilhamos com terceiros, exceto os provedores de infraestrutura listados abaixo, que tratam os dados em nosso nome.</p>
          <h2>Onde ficam os dados</h2>
          <p>Hospedagem e banco de dados na Supabase e na Vercel, com criptografia em trânsito e em repouso. A organização controla quem, dentro dela, vê cada tipo de dado, por permissões.</p>
          <h2>Seus direitos</h2>
          <p>Conforme a LGPD (Brasil) e leis equivalentes, a pessoa titular pode pedir acesso, correção ou exclusão dos seus dados. Como a organização é quem cadastra e controla esses dados, o pedido deve ser feito a ela; a Mercy atende a organização nesses pedidos. Pedidos diretos podem ser enviados para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
          <h2>Cookies</h2>
          <p>Usamos apenas cookies necessários: sessão de login e preferências de interface (tema, campus). Sem cookies de rastreamento.</p>
          <h2>Mudanças</h2>
          <p>Se esta política mudar, a data acima é atualizada e as organizações são avisadas por e-mail quando a mudança for relevante.</p>
        </article>
        <SiteFooter lang="pt" />
      </div>
    </div>
  );
}
