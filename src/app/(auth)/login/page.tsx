import { LogoMark } from "@/components/shared/LogoMark";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="gate">
      <div className="gcard">
        <LogoMark />
        <LoginForm />
      </div>
    </div>
  );
}
