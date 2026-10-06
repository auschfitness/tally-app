import type { Metadata } from "next";
import { Landing } from "../Landing";

export const metadata: Metadata = {
  title: "Tally · Church OS",
  description: "One system for your church: Bible study, people, groups, attendance, giving and communication.",
};

export default function RootPage() {
  return <Landing lang="en" />;
}
