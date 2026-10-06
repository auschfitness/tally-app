import type { Metadata } from "next";
import { Landing } from "../Landing";

export const metadata: Metadata = {
  title: "Tally · Church OS",
  description: "Um sistema só para a sua igreja: estudo bíblico, pessoas, grupos, presença, doações e comunicação.",
};

export default function SitePage() {
  return <Landing lang="pt" />;
}
