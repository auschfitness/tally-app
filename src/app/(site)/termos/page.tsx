import type { Metadata } from "next";
import { SiteNav, SiteFooter, SITE } from "../Landing";
import s from "../site.module.css";

export const metadata: Metadata = { title: "Termos de uso · Mercy" };

export default function TermosPage() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <SiteNav lang="pt" />
        <article className={s.doc}>
          <h1>Termos de uso</h1>
          <p className={s.meta}>Última atualização: 6 de outubro de 2026</p>
          <h2>1. O serviço</h2>
          <p>A Mercy é um sistema de gestão para igrejas, oferecido por {SITE.company}, em {SITE.city}. Ao criar uma conta, a igreja (a organização) passa a usar o serviço nas condições descritas aqui.</p>
          <h2>2. Contas e acesso</h2>
          <p>Cada pessoa acessa a Mercy com uma conta própria, criada por convite da organização. A organização é responsável por quem convida e por manter as permissões de cada pessoa atualizadas.</p>
          <h2>3. Dados da organização</h2>
          <p>Os dados cadastrados (pessoas, grupos, presença, doações, notas e sermões) pertencem à organização. A Mercy não vende, não cede e não usa esses dados para fins próprios. A organização pode pedir a exportação ou a exclusão dos seus dados a qualquer momento pelo e-mail de contato.</p>
          <h2>4. Conteúdo bíblico e de terceiros</h2>
          <p>O texto bíblico, os dicionários e os comentários exibidos na Mercy vêm de fontes de domínio público ou com licença aberta, com os créditos indicados em cada tela. O uso desse conteúdo segue as licenças das respectivas fontes.</p>
          <h2>5. Disponibilidade</h2>
          <p>O serviço é oferecido como está, com esforço para manter a disponibilidade e a integridade dos dados, incluindo backups regulares. Manutenções programadas são avisadas com antecedência quando possível.</p>
          <h2>6. Encerramento</h2>
          <p>A organização pode encerrar a conta quando quiser. A Mercy pode suspender contas que violem estes termos ou a lei, avisando o responsável pela organização.</p>
          <h2>7. Contato</h2>
          <p>Dúvidas sobre estes termos: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
        </article>
        <SiteFooter lang="pt" />
      </div>
    </div>
  );
}
