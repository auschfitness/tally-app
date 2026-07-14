import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { LogoMark } from "@/components/shared/LogoMark";
import { OnboardingForm } from "./OnboardingForm";

// Só para quem está logado e ainda não tem org. Se já tem membership, vai pro app.
export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("memberships").select("org_id").limit(1).maybeSingle();
  if (data) redirect("/");

  return (
    <div className="gate">
      <div className="gcard">
        <LogoMark />
        <OnboardingForm />
      </div>
    </div>
  );
}
