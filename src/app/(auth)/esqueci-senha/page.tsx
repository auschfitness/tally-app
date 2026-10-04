import { BrandPanel } from "../login/BrandPanel";
import { ForgotForm } from "./ForgotForm";
import s from "../login/login.module.css";

export default function ForgotPage() {
  return (
    <div className={s.page}>
      <BrandPanel />
      <main className={s.pane}>
        <ForgotForm />
      </main>
    </div>
  );
}
