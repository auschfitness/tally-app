// Logo do banco da conta num quadrado branco de tamanho fixo (as logos oficiais vêm com
// fundos diferentes; o quadrado deixa todas iguais). Caixa físico e "outro banco" usam ícone.
import { Landmark, Wallet } from "lucide-react";
import { bankByCode, bankLogo, CASH_CODE } from "../banks";
import styles from "../finance.module.css";

export function BankLogo({ bankCode, size = "md" }: { bankCode: string | null; size?: "sm" | "md" }) {
  const logo = bankLogo(bankCode);
  const cls = `${styles.bankLogo}${size === "sm" ? ` ${styles.bankLogoSm}` : ""}`;
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- PNG estático de 256px, sem otimização a fazer
    return <img className={cls} src={logo} alt={bankByCode(bankCode)?.name ?? ""} />;
  }
  const Icon = bankCode === CASH_CODE ? Wallet : Landmark;
  return (
    <span className={`${cls} ${styles.bankIcon}`} aria-hidden="true">
      <Icon />
    </span>
  );
}
