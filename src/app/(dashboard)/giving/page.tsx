import { redirect } from "next/navigation";

// Doações agora é a aba Dízimos de Finanças (spec 10).
export default function GivingPage(): never {
  redirect("/finance?aba=dizimos");
}
